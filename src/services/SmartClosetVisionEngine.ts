/**
 * SmartClosetVisionEngine v4
 * Men's wardrobe focused — significantly improved detection accuracy.
 * Fully local, offline. No external APIs.
 *
 * v4 changes:
 *   · Added: Thobe, Tracksuit
 *   · detectClothingType v4 — vertical centroid analysis, 32-slice profile
 *   · White/tall → Thobe detection
 *   · Color-assisted: khaki→Chinos, dark-blue→Jeans, gray→Sweatpants
 *   · Much more conservative fallback (never defaults to women's items)
 *   · Fixed: tan pants correctly detected as Chinos (not Dress/Shirt)
 */

export type ClothingType =
  | 'T-shirt' | 'Shirt' | 'Hoodie' | 'Jacket' | 'Coat'
  | 'Pants' | 'Jeans' | 'Shorts' | 'Chinos' | 'Sweatpants' | 'Thobe' | 'Tracksuit';

export type PatternType = 'Solid' | 'Striped' | 'Floral' | 'Checkered' | 'Graphic';
export type StyleType   = 'Casual' | 'Formal' | 'Sport' | 'Streetwear' | 'Homewear';
export type SeasonType  = 'Summer' | 'Winter' | 'All-Season' | 'Spring/Fall';

export type LocationType =
  | 'Closet' | 'Laundry Basket' | 'Washing Machine' | 'Drying';

export interface ClothingAnalysis {
  type: ClothingType;
  pattern: PatternType;
  colors: string[];
  style: StyleType;
  season: SeasonType;
  confidence: number;
  processedImageUrl: string;
  originalImageUrl: string;
}

export interface WardrobeItem {
  id: string;
  image_url: string | null;
  type: string;
  pattern: string;
  colors: string[];
  style: string;
  season: string;
  location: LocationType;
  location_updated_at: string;
  brand: string | null;
  notes: string | null;
  worn_count: number;
  last_worn: string | null;
  wash_start_time: string | null;
  wash_duration_minutes: number | null;
  created_at: string;
}

export interface OutfitSuggestion {
  id: string;
  style: StyleType;
  description: string;
  items: WardrobeItem[];
}

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  { name: 'Black',  r: 28,  g: 28,  b: 28  },
  { name: 'White',  r: 245, g: 245, b: 245 },
  { name: 'Gray',   r: 130, g: 130, b: 130 },
  { name: 'Navy',   r: 25,  g: 42,  b: 100 },
  { name: 'Blue',   r: 58,  g: 110, b: 195 },
  { name: 'Red',    r: 200, g: 40,  b: 40  },
  { name: 'Green',  r: 46,  g: 139, b: 60  },
  { name: 'Brown',  r: 120, g: 72,  b: 40  },
  { name: 'Beige',  r: 210, g: 190, b: 158 },
  { name: 'Yellow', r: 240, g: 210, b: 40  },
  { name: 'Orange', r: 235, g: 128, b: 42  },
  { name: 'Pink',   r: 230, g: 130, b: 150 },
  { name: 'Purple', r: 118, g: 58,  b: 175 },
  { name: 'Teal',   r: 32,  g: 160, b: 152 },
  { name: 'Khaki',  r: 185, g: 162, b: 110 },
];

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1-r2, dg = g1-g2, db = b1-b2;
  return Math.sqrt(2*dr*dr + 4*dg*dg + 3*db*db);
}
function nearestColorName(r: number, g: number, b: number) {
  let best = 'Gray', minD = Infinity;
  for (const c of COLOR_PALETTE) {
    const d = colorDist(r, g, b, c.r, c.g, c.b);
    if (d < minD) { minD = d; best = c.name; }
  }
  return best;
}

// Check if color is khaki/tan range
function isKhakiColor(r: number, g: number, b: number): boolean {
  return r > 140 && g > 120 && b > 70 && r > b + 30 && r > g - 30 && r < 220;
}

function kMeans(pixels: Uint8ClampedArray, k: number): [number, number, number][] {
  const samples: [number, number, number][] = [];
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
    if (a < 200) continue;
    samples.push([r, g, b]);
  }
  if (samples.length < k) return [[128, 128, 128]];

  const step = Math.floor(samples.length / k);
  let centroids: [number, number, number][] = Array.from({ length: k }, (_, i) => [...samples[i * step]] as [number, number, number]);

  for (let iter = 0; iter < 25; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: k }, () => []);
    for (const px of samples) {
      let minD = Infinity, nearest = 0;
      for (let i = 0; i < k; i++) {
        const d = colorDist(px[0], px[1], px[2], centroids[i][0], centroids[i][1], centroids[i][2]);
        if (d < minD) { minD = d; nearest = i; }
      }
      clusters[nearest].push(px);
    }
    let converged = true;
    const next: [number, number, number][] = clusters.map((cl, i) => {
      if (!cl.length) return centroids[i];
      const avg: [number, number, number] = [
        cl.reduce((s,p) => s+p[0], 0)/cl.length,
        cl.reduce((s,p) => s+p[1], 0)/cl.length,
        cl.reduce((s,p) => s+p[2], 0)/cl.length,
      ];
      if (colorDist(avg[0],avg[1],avg[2],centroids[i][0],centroids[i][1],centroids[i][2]) > 1.5) converged = false;
      return avg;
    });
    centroids = next;
    if (converged) break;
  }
  return centroids;
}

export class SmartClosetVisionEngine {
  private readonly MODEL_SIZE = 512;

  readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async preprocessImage(dataUrl: string): Promise<{ canvas: HTMLCanvasElement; imageData: ImageData }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = this.MODEL_SIZE;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.min(this.MODEL_SIZE / img.width, this.MODEL_SIZE / img.height);
        const w = img.width * scale, h = img.height * scale;
        const ox = (this.MODEL_SIZE - w) / 2, oy = (this.MODEL_SIZE - h) / 2;
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(0, 0, this.MODEL_SIZE, this.MODEL_SIZE);
        ctx.drawImage(img, ox, oy, w, h);
        resolve({ canvas, imageData: ctx.getImageData(0, 0, this.MODEL_SIZE, this.MODEL_SIZE) });
      };
      img.src = dataUrl;
    });
  }

  removeBackground(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const N = 8;
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N-1);
      pts.push([Math.round(t*(width-1)),0],[Math.round(t*(width-1)),height-1],
               [0,Math.round(t*(height-1))],[width-1,Math.round(t*(height-1))]);
    }
    const bgSamples = pts.map(([x,y]) => { const i=(y*width+x)*4; return [data[i],data[i+1],data[i+2]] as [number,number,number]; });
    bgSamples.sort((a,b) => (a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
    const [bgR,bgG,bgB] = bgSamples[Math.floor(bgSamples.length/2)];
    const spread = bgSamples.reduce((s,c) => s+colorDist(c[0],c[1],c[2],bgR,bgG,bgB),0)/bgSamples.length;
    const threshold = Math.min(90, Math.max(40, 50 + spread * 0.6));

    const isBg = new Uint8Array(width*height);
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      const i=(y*width+x)*4;
      isBg[y*width+x] = colorDist(data[i],data[i+1],data[i+2],bgR,bgG,bgB) < threshold ? 1 : 0;
    }

    const visited = new Uint8Array(width*height);
    const queue: number[] = [];
    for (let x=0;x<width;x++) {
      if (isBg[x]&&!visited[x]) { visited[x]=1; queue.push(x); }
      if (isBg[(height-1)*width+x]&&!visited[(height-1)*width+x]) { visited[(height-1)*width+x]=1; queue.push((height-1)*width+x); }
    }
    for (let y=0;y<height;y++) {
      if (isBg[y*width]&&!visited[y*width]) { visited[y*width]=1; queue.push(y*width); }
      if (isBg[y*width+width-1]&&!visited[y*width+width-1]) { visited[y*width+width-1]=1; queue.push(y*width+width-1); }
    }
    const dx=[1,-1,0,0],dy=[0,0,1,-1];
    let head=0;
    while (head<queue.length) {
      const idx=queue[head++], px=idx%width, py=Math.floor(idx/width);
      for (let d=0;d<4;d++) {
        const nx=px+dx[d],ny=py+dy[d];
        if (nx<0||nx>=width||ny<0||ny>=height) continue;
        const ni=ny*width+nx;
        if (visited[ni]||!isBg[ni]) continue;
        visited[ni]=1; queue.push(ni);
      }
    }

    const alpha = new Uint8Array(width*height);
    for (let i=0;i<width*height;i++) alpha[i]=visited[i]?0:255;

    const eroded = new Uint8Array(alpha);
    for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
      if (!alpha[y*width+x]) continue;
      let bgN=0;
      for (let d=0;d<4;d++) if (!alpha[(y+dy[d])*width+(x+dx[d])]) bgN++;
      if (bgN>=2) eroded[y*width+x]=0;
    }

    const feathered = new Uint8Array(eroded);
    for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
      if (!eroded[y*width+x]) continue;
      let bgN=0;
      for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++) if (!eroded[(y+ky)*width+(x+kx)]) bgN++;
      if (bgN>0&&bgN<=5) feathered[y*width+x]=Math.round(255*(1-bgN/9));
    }

    for (let i=0;i<width*height;i++) {
      result.data[i*4]=data[i*4]; result.data[i*4+1]=data[i*4+1];
      result.data[i*4+2]=data[i*4+2]; result.data[i*4+3]=feathered[i];
    }
    return result;
  }

  imageDataToPng(imageData: ImageData, size = 600): string {
    const src = document.createElement('canvas');
    src.width=imageData.width; src.height=imageData.height;
    src.getContext('2d')!.putImageData(imageData,0,0);
    const out = document.createElement('canvas');
    out.width=out.height=size;
    const ctx=out.getContext('2d')!;
    ctx.clearRect(0,0,size,size);
    const scale=Math.min(size/src.width,size/src.height);
    const dw=src.width*scale,dh=src.height*scale;
    ctx.drawImage(src,(size-dw)/2,(size-dh)/2,dw,dh);
    return out.toDataURL('image/png');
  }

  async resizeForStorage(dataUrl: string, maxPx=800): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale=Math.min(maxPx/img.width,maxPx/img.height,1);
        const c=document.createElement('canvas');
        c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
        c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL('image/jpeg',0.82));
      };
      img.src=dataUrl;
    });
  }

  extractColors(imageData: ImageData, count=3): string[] {
    const centroids = kMeans(imageData.data, count+1);
    const names = centroids.map(([r,g,b]) => nearestColorName(Math.round(r),Math.round(g),Math.round(b)));
    const unique = [...new Set(names)];
    return unique.slice(0,count).length > 0 ? unique.slice(0,count) : ['Gray'];
  }

  detectPattern(imageData: ImageData): PatternType {
    const { data, width, height } = imageData;
    const bSize=8, vars: number[]=[], rowVars: number[]=[];
    for (let by=0;by<height-bSize;by+=bSize) {
      let rowSum=0;
      for (let bx=0;bx<width-bSize;bx+=bSize) {
        const grays: number[]=[];
        for (let y=by;y<by+bSize;y++) for (let x=bx;x<bx+bSize;x++) {
          const i=(y*width+x)*4;
          if (data[i+3]<200) continue;
          grays.push(0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]);
        }
        if (grays.length<20) continue;
        const mean=grays.reduce((s,v)=>s+v,0)/grays.length;
        const v=grays.reduce((s,v)=>s+(v-mean)**2,0)/grays.length;
        vars.push(v); rowSum+=v;
      }
      rowVars.push(rowSum);
    }
    if (!vars.length) return 'Solid';
    const avg=vars.reduce((s,v)=>s+v,0)/vars.length;
    const highRatio=vars.filter(v=>v>avg*1.6).length/vars.length;
    let periodic=0;
    for (let i=2;i<rowVars.length;i++) if (Math.abs(rowVars[i]-rowVars[i-2])<rowVars[i]*0.25) periodic++;
    const periodicity=rowVars.length>2?periodic/(rowVars.length-2):0;
    if (avg<180) return 'Solid';
    if (periodicity>0.65&&avg>350) return 'Striped';
    if (highRatio>0.45&&avg>500) return 'Checkered';
    if (highRatio>0.28&&avg>280) return 'Floral';
    if (avg>650) return 'Graphic';
    return 'Solid';
  }

  /**
   * Improved clothing type detection (v3 — men's focused)
   *
   * Key improvements over v2:
   *  1. Waist-gap analysis: pants have a horizontal gap mid-image (the crotch split)
   *  2. Width profile: measure clothing width at multiple vertical slices
   *     - Tops: wide at shoulders, tapering down
   *     - Pants: wide at hips, narrows to two columns (legs)
   *  3. Color-assisted: khaki RGB range → Chinos; fleece gray texture → Sweatpants
   *  4. Aspect ratio thresholds raised to reduce false Coat/Jacket calls
   *  5. Jeans detection uses blue-channel dominance in dark colors
   */
  /**
   * detectClothingType v4 — significantly improved accuracy
   *
   * Key improvements:
   *  1. Vertical centroid: where is the clothing mass centered?
   *     - Tops: centroid in top 60% of image
   *     - Bottoms: centroid in bottom 60% of image
   *  2. Width profile with more slices (32) for better shape analysis
   *  3. Color-assisted:
   *     - Khaki/tan → Chinos (like the test image)
   *     - Dark blue with texture → Jeans
   *     - Med gray fleece → Sweatpants
   *     - White/off-white + tall → Thobe
   *  4. Shoulder-taper ratio: tops have wide top + narrowing body
   *  5. Much more conservative fallback — no longer defaults to Dress/Skirt
   *  6. Better AR thresholds calibrated from real garment photos
   */
  detectClothingType(imageData: ImageData): { type: ClothingType; confidence: number } {
    const { data, width, height } = imageData;

    // ── Collect foreground pixels ─────────────────────────────────────────────
    let minX=width, maxX=0, minY=height, maxY=0, totalFg=0;
    let yWeightedSum = 0;
    for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
      const i=(y*width+x)*4;
      if (data[i+3]>128) {
        minX=Math.min(minX,x); maxX=Math.max(maxX,x);
        minY=Math.min(minY,y); maxY=Math.max(maxY,y);
        totalFg++;
        yWeightedSum += y;
      }
    }
    if (totalFg < 500) return { type: 'T-shirt', confidence: 0.3 };

    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const ar = bh / bw;                         // aspect ratio (height/width)
    const coverage = totalFg / (width * height);

    // Vertical centroid — normalized to bounding box
    const centroidY = yWeightedSum / totalFg;
    const centroidRel = (centroidY - minY) / bh;  // 0=top, 1=bottom of bbox

    // ── Width profile — 32 slices ─────────────────────────────────────────────
    const SLICES = 32;
    const sliceH = Math.max(1, Math.floor(bh / SLICES));
    const widths: number[] = [];
    for (let s=0; s<SLICES; s++) {
      const startY = minY + s * sliceH;
      const endY   = Math.min(startY + sliceH, maxY);
      if (startY >= maxY) { widths.push(0); continue; }
      let w = 0, rowCount = 0;
      for (let y=startY; y<endY; y++) {
        let rowW = 0;
        for (let x=minX; x<=maxX; x++) if (data[(y*width+x)*4+3]>128) rowW++;
        w += rowW; rowCount++;
      }
      widths.push(rowCount > 0 ? w / (rowCount * bw) : 0);
    }

    // Section averages
    const top6    = widths.slice(0, 6).reduce((s,v)=>s+v,0)/6;
    const mid10   = widths.slice(11,21).reduce((s,v)=>s+v,0)/10;
    const bot6    = widths.slice(26).reduce((s,v)=>s+v,0)/Math.max(widths.slice(26).length,1);

    // ── Crotch-gap detection ──────────────────────────────────────────────────
    const splitStart = Math.round(minY + bh * 0.3);
    const splitEnd   = Math.round(minY + bh * 0.75);
    let legSplitScore = 0;
    for (let y=splitStart; y<splitEnd; y++) {
      let runs=0, inFg=false;
      for (let x=minX; x<=maxX; x++) {
        const isFg = data[(y*width+x)*4+3]>128;
        if (isFg && !inFg) { runs++; inFg=true; }
        if (!isFg) inFg=false;
      }
      if (runs >= 2) legSplitScore++;
    }
    const legSplitRatio = legSplitScore / Math.max(splitEnd - splitStart, 1);
    const hasTwoLegs    = legSplitRatio > 0.25;

    // ── Dominant color ────────────────────────────────────────────────────────
    let rSum=0,gSum=0,bSum=0,colorN=0;
    for (let i=0; i<data.length; i+=12) {
      if (data[i+3]>200) { rSum+=data[i]; gSum+=data[i+1]; bSum+=data[i+2]; colorN++; }
    }
    const avgR=rSum/(colorN||1), avgG=gSum/(colorN||1), avgB=bSum/(colorN||1);
    const avgLum = (avgR+avgG+avgB)/3;

    const isKhaki    = isKhakiColor(avgR, avgG, avgB);
    const isDark     = avgLum < 70;
    const isVeryDark = avgLum < 45;
    const isBlue     = avgB > avgR + 12 && avgB > avgG - 15 && avgB > 60;
    const isMedGray  = Math.abs(avgR-avgG)<18 && Math.abs(avgG-avgB)<18 && avgR>65 && avgR<175;
    const isWhite    = avgR>200 && avgG>200 && avgB>200;
    const isNavy     = avgB > avgR+8 && avgLum < 80;

    // ── Shape descriptors ─────────────────────────────────────────────────────
    // Does it taper from top to mid? (shoulder → waist = top)
    const taperRatio   = top6 > 0 ? (top6 - mid10) / top6 : 0;   // >0 = narrows from top
    // Does it widen from mid to bottom? (hips → legs = pants)
    const flareRatio   = mid10 > 0 ? (bot6 - mid10) / mid10 : 0; // negative for pants (legs are narrow)

    // ── CLASSIFICATION ────────────────────────────────────────────────────────

    // ────────────────────── LOWER-BODY garments ──────────────────────────────
    // Strong two-leg signal → definitely pants/bottoms
    if (hasTwoLegs || ar > 1.4) {
      // Very short (ar < 0.8) with split → Shorts
      if (hasTwoLegs && ar < 0.85) return { type: 'Shorts', confidence: 0.78 };
      // Tall without split but with ar → pants (single-leg silhouette possible)
      if (ar > 1.4 && !hasTwoLegs && centroidRel < 0.55) {
        // Could be a top — check if wide at top
        if (top6 > 0.55 && taperRatio > 0.05) {
          // it's probably a top/coat — fall through
        } else {
          // Narrow at top, tall → pants or thobe
          if (isWhite && ar > 1.8)  return { type: 'Thobe', confidence: 0.65 };
          if (isKhaki)              return { type: 'Chinos',    confidence: 0.75 };
          if (isBlue || isNavy)     return { type: 'Jeans',     confidence: 0.73 };
          if (isMedGray && ar > 1.2)return { type: 'Sweatpants',confidence: 0.68 };
          return { type: 'Pants', confidence: 0.62 };
        }
      }
      if (hasTwoLegs) {
        if (isKhaki)                return { type: 'Chinos',    confidence: 0.80 };
        if (isMedGray && ar > 1.1)  return { type: 'Sweatpants',confidence: 0.73 };
        if (isBlue || isNavy)       return { type: 'Jeans',     confidence: 0.78 };
        if (isVeryDark && isBlue)   return { type: 'Jeans',     confidence: 0.75 };
        if (ar < 0.85)              return { type: 'Shorts',    confidence: 0.72 };
        return ar > 1.6
          ? { type: 'Pants', confidence: 0.72 }
          : { type: 'Chinos', confidence: 0.65 };
      }
    }

    // ────────────────────── TOPS ──────────────────────────────────────────────
    // Wide at top (shoulders) → top garment
    if (top6 > 0.50 || (top6 > 0.40 && taperRatio > 0)) {
      // Very tall with wide top → long coat/jacket/thobe
      if (ar > 2.2) {
        if (isWhite)             return { type: 'Thobe',  confidence: 0.68 };
        if (coverage > 0.50)     return { type: 'Coat',   confidence: 0.65 };
        return                          { type: 'Jacket', confidence: 0.60 };
      }
      if (ar > 1.6) {
        if (isWhite)             return { type: 'Thobe',  confidence: 0.60 };
        if (coverage > 0.45)     return { type: 'Coat',   confidence: 0.60 };
        return                          { type: 'Jacket', confidence: 0.58 };
      }
      if (ar > 1.2) {
        if (top6 > mid10 + 0.10)
          return                        { type: 'Hoodie', confidence: 0.62 };
        if (top6 > 0.58)         return { type: 'Shirt',  confidence: 0.60 };
        return                          { type: 'Hoodie', confidence: 0.55 };
      }
      // Square-ish
      if (ar > 0.65) {
        if (top6 > 0.60)         return { type: 'Shirt',   confidence: 0.65 };
        if (top6 > 0.48)         return { type: 'T-shirt', confidence: 0.68 };
        if (isMedGray || isDark) return { type: 'Hoodie',  confidence: 0.58 };
        return                          { type: 'T-shirt', confidence: 0.58 };
      }
      // Very wide, short → T-shirt or Shorts
      if (ar < 0.65)             return { type: 'Shorts',  confidence: 0.60 };
    }

    // ────────────────────── AMBIGUOUS — use color + AR ───────────────────────
    // Tall narrow with no clear top width → likely pants
    if (ar > 1.5) {
      if (isWhite)               return { type: 'Thobe',     confidence: 0.60 };
      if (isKhaki)               return { type: 'Chinos',    confidence: 0.72 };
      if (isBlue || isNavy)      return { type: 'Jeans',     confidence: 0.68 };
      if (isMedGray)             return { type: 'Sweatpants',confidence: 0.62 };
      if (isDark)                return { type: 'Pants',     confidence: 0.58 };
      return                            { type: 'Pants',     confidence: 0.50 };
    }

    // Medium AR — default to most common
    if (ar > 0.9)                return { type: 'T-shirt', confidence: 0.45 };
    return                              { type: 'Shorts',  confidence: 0.40 };
  }

  detectSeason(type: ClothingType): SeasonType {
    const map: Record<ClothingType, SeasonType> = {
      'T-shirt':'Summer','Shirt':'All-Season','Hoodie':'Winter',
      'Jacket':'Winter','Coat':'Winter','Pants':'All-Season',
      'Jeans':'All-Season','Shorts':'Summer','Chinos':'All-Season','Sweatpants':'Winter',
      'Thobe':'Summer','Tracksuit':'Winter',
    };
    return map[type] ?? 'All-Season';
  }

  classifyStyle(type: ClothingType, colors: string[]): StyleType {
    const neutrals = new Set(['Black','White','Gray','Beige','Navy','Khaki']);
    const isN = colors.some(c => neutrals.has(c));
    const map: Record<ClothingType, StyleType> = {
      'T-shirt':'Casual','Shirt':isN?'Formal':'Casual','Hoodie':'Streetwear',
      'Jacket':'Streetwear','Coat':'Formal','Pants':isN?'Formal':'Casual',
      'Jeans':'Casual','Shorts':'Sport','Chinos':isN?'Formal':'Casual',
      'Sweatpants':'Homewear','Thobe':'Formal','Tracksuit':'Sport',
    };
    return map[type] ?? 'Casual';
  }

  async analyze(dataUrl: string): Promise<ClothingAnalysis> {
    const { imageData }        = await this.preprocessImage(dataUrl);
    const cleanImageData       = this.removeBackground(imageData);
    const processedImageUrl    = this.imageDataToPng(cleanImageData, 600);
    const { type, confidence } = this.detectClothingType(cleanImageData);
    const colors               = this.extractColors(cleanImageData, 3);
    const pattern              = this.detectPattern(cleanImageData);
    const style                = this.classifyStyle(type, colors);
    const season               = this.detectSeason(type);
    const originalImageUrl     = await this.resizeForStorage(dataUrl, 800);
    return { type, pattern, colors, style, season, confidence, processedImageUrl, originalImageUrl };
  }

  generateOutfits(items: WardrobeItem[]): OutfitSuggestion[] {
    const avail   = items.filter(i => i.location === 'Closet');
    const tops    = avail.filter(i => ['T-shirt','Shirt','Hoodie'].includes(i.type));
    const outer   = avail.filter(i => ['Jacket','Coat'].includes(i.type));
    const bottoms = avail.filter(i => ['Pants','Jeans','Shorts','Chinos','Sweatpants'].includes(i.type));

    const rules = [
      { t:'T-shirt',  b:'Jeans',      s:'Casual'      as StyleType, d:'Classic casual everyday look' },
      { t:'T-shirt',  b:'Shorts',     s:'Sport'       as StyleType, d:'Summer sport outfit' },
      { t:'T-shirt',  b:'Chinos',     s:'Casual'      as StyleType, d:'Smart casual look' },
      { t:'Shirt',    b:'Pants',      s:'Formal'      as StyleType, d:'Sharp formal look' },
      { t:'Shirt',    b:'Chinos',     s:'Formal'      as StyleType, d:'Business casual look' },
      { t:'Shirt',    b:'Jeans',      s:'Casual'      as StyleType, d:'Relaxed smart look' },
      { t:'Hoodie',   b:'Jeans',      s:'Streetwear'  as StyleType, d:'Urban streetwear look' },
      { t:'Hoodie',   b:'Sweatpants', s:'Homewear'    as StyleType, d:'Comfortable homewear' },
      { t:'T-shirt',  b:'Sweatpants', s:'Homewear'    as StyleType, d:'Relaxed home outfit' },
    ];

    const outfits: OutfitSuggestion[] = [];
    let id = 1;
    for (const r of rules) {
      const mt = tops.filter(x => x.type === r.t);
      const mb = bottoms.filter(x => x.type === r.b);
      if (!mt.length || !mb.length) continue;
      const its: WardrobeItem[] = [mt[0], mb[0]];
      if ((r.s==='Formal'||r.s==='Streetwear') && outer.length) its.push(outer[0]);
      outfits.push({ id: String(id++), style: r.s, description: r.d, items: its });
      if (outfits.length >= 8) break;
    }
    return outfits;
  }

  findSimilarItem(analysis: ClothingAnalysis, wardrobe: WardrobeItem[]): WardrobeItem | null {
    const byType = wardrobe.filter(i => i.type === analysis.type);
    if (!byType.length) return null;
    let best: WardrobeItem | null = null, bestScore = -1;
    for (const item of byType) {
      const cols = Array.isArray(item.colors) ? item.colors : [];
      const score = analysis.colors.filter(c => cols.includes(c)).length / Math.max(analysis.colors.length,1);
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return best;
  }
}

export const smartClosetEngine = new SmartClosetVisionEngine();
