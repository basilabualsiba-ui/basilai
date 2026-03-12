/**
 * SmartClosetVisionEngine v2
 * Fully local, offline-capable clothing analysis engine.
 * No external APIs — pure canvas + JS image processing.
 *
 * v2 improvements:
 *   · Dense perimeter sampling (32 pts) for background color estimation
 *   · Edge flood-fill to remove connected background region
 *   · Morphological erosion to trim fringe artifacts
 *   · Alpha feathering for soft, natural cutout edges
 *   · PNG output to preserve transparency (JPEG strips alpha)
 *   · Color extraction strictly from opaque clothing pixels only (alpha > 200)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClothingType =
  | 'T-shirt' | 'Shirt' | 'Hoodie' | 'Jacket' | 'Coat'
  | 'Pants' | 'Jeans' | 'Shorts' | 'Skirt' | 'Dress';

export type PatternType = 'Solid' | 'Striped' | 'Floral' | 'Checkered' | 'Graphic';
export type StyleType   = 'Casual' | 'Formal' | 'Sport' | 'Streetwear' | 'Homewear';
export type SeasonType  = 'Summer' | 'Winter' | 'All-Season' | 'Spring/Fall';

export type LocationType =
  | 'Closet' | 'Laundry Basket' | 'Washing Machine' | 'Drying' | 'Ready to Wear';

export interface ClothingAnalysis {
  type: ClothingType;
  pattern: PatternType;
  colors: string[];
  style: StyleType;
  season: SeasonType;
  confidence: number;
  processedImageUrl: string; // transparent PNG — background removed
  originalImageUrl: string;  // compressed JPEG for reference
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
];

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function nearestColorName(r: number, g: number, b: number): string {
  let best = 'Gray', minD = Infinity;
  for (const c of COLOR_PALETTE) {
    const d = colorDist(r, g, b, c.r, c.g, c.b);
    if (d < minD) { minD = d; best = c.name; }
  }
  return best;
}

// ─── K-Means Clustering ───────────────────────────────────────────────────────

function kMeans(pixels: Uint8ClampedArray, k: number): [number, number, number][] {
  const samples: [number, number, number][] = [];

  // Only fully-opaque pixels = clothing (background was zeroed by removeBackground)
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
    if (a < 200) continue;
    samples.push([r, g, b]);
  }
  if (samples.length < k) return [[128, 128, 128]];

  const step = Math.floor(samples.length / k);
  let centroids: [number, number, number][] = Array.from(
    { length: k }, (_, i) => [...samples[i * step]] as [number, number, number]
  );

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
    const next: [number, number, number][] = clusters.map((cluster, i) => {
      if (!cluster.length) return centroids[i];
      const avg: [number, number, number] = [
        cluster.reduce((s, p) => s + p[0], 0) / cluster.length,
        cluster.reduce((s, p) => s + p[1], 0) / cluster.length,
        cluster.reduce((s, p) => s + p[2], 0) / cluster.length,
      ];
      if (colorDist(avg[0], avg[1], avg[2], centroids[i][0], centroids[i][1], centroids[i][2]) > 1.5) converged = false;
      return avg;
    });
    centroids = next;
    if (converged) break;
  }

  // Sort by cluster population (biggest = most dominant color)
  const sized = centroids.map(c => {
    const size = samples.filter(px => {
      let minD = Infinity, best = 0;
      for (let j = 0; j < k; j++) {
        const d = colorDist(px[0], px[1], px[2], centroids[j][0], centroids[j][1], centroids[j][2]);
        if (d < minD) { minD = d; best = j; }
      }
      return centroids[best] === c;
    }).length;
    return { c, size };
  });
  sized.sort((a, b) => b.size - a.size);
  return sized.map(s => s.c);
}

// ─── SmartClosetVisionEngine ──────────────────────────────────────────────────

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

  /**
   * BackgroundRemovalModule v2
   * 1. Sample 32 perimeter points → estimate background color (median)
   * 2. BFS flood-fill from all 4 edges for connected background
   * 3. Morphological erosion to remove 1px halo/fringe
   * 4. Alpha feathering on boundary for soft cutout
   */
  removeBackground(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);

    // ── 1. Sample 32 perimeter points ────────────────────────────────────
    const pts: [number, number][] = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pts.push(
        [Math.round(t * (width-1)), 0],
        [Math.round(t * (width-1)), height-1],
        [0, Math.round(t * (height-1))],
        [width-1, Math.round(t * (height-1))],
      );
    }
    const bgSamples = pts.map(([x, y]) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i+1], data[i+2]] as [number, number, number];
    });
    bgSamples.sort((a, b) => (a[0]+a[1]+a[2]) - (b[0]+b[1]+b[2]));
    const [bgR, bgG, bgB] = bgSamples[Math.floor(bgSamples.length / 2)];

    // Adaptive threshold
    const spread = bgSamples.reduce((s, c) => s + colorDist(c[0], c[1], c[2], bgR, bgG, bgB), 0) / bgSamples.length;
    const threshold = Math.min(90, Math.max(40, 50 + spread * 0.6));

    // ── 2. Per-pixel similarity map ───────────────────────────────────────
    const isBg = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        isBg[y * width + x] = colorDist(data[i], data[i+1], data[i+2], bgR, bgG, bgB) < threshold ? 1 : 0;
      }
    }

    // ── 3. BFS flood-fill from all edges ──────────────────────────────────
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];
    for (let x = 0; x < width; x++) {
      const top = x, bot = (height-1)*width+x;
      if (isBg[top] && !visited[top]) { visited[top] = 1; queue.push(top); }
      if (isBg[bot] && !visited[bot]) { visited[bot] = 1; queue.push(bot); }
    }
    for (let y = 0; y < height; y++) {
      const L = y*width, R = y*width+width-1;
      if (isBg[L] && !visited[L]) { visited[L] = 1; queue.push(L); }
      if (isBg[R] && !visited[R]) { visited[R] = 1; queue.push(R); }
    }
    const dx = [1,-1,0,0], dy = [0,0,1,-1];
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const px = idx % width, py = Math.floor(idx / width);
      for (let d = 0; d < 4; d++) {
        const nx = px+dx[d], ny = py+dy[d];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny*width+nx;
        if (visited[ni] || !isBg[ni]) continue;
        visited[ni] = 1; queue.push(ni);
      }
    }

    // ── 4. Build alpha mask ───────────────────────────────────────────────
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = visited[i] ? 0 : 255;

    // ── 5. Morphological erosion (remove 1px fringe) ──────────────────────
    const eroded = new Uint8Array(alpha);
    for (let y = 1; y < height-1; y++) {
      for (let x = 1; x < width-1; x++) {
        if (!alpha[y*width+x]) continue;
        let bgN = 0;
        for (let d = 0; d < 4; d++) {
          if (!alpha[(y+dy[d])*width+(x+dx[d])]) bgN++;
        }
        if (bgN >= 2) eroded[y*width+x] = 0;
      }
    }

    // ── 6. Alpha feathering on boundary ──────────────────────────────────
    const feathered = new Uint8Array(eroded);
    for (let y = 1; y < height-1; y++) {
      for (let x = 1; x < width-1; x++) {
        if (!eroded[y*width+x]) continue;
        let bgN = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            if (!eroded[(y+ky)*width+(x+kx)]) bgN++;
          }
        }
        if (bgN > 0 && bgN <= 5) feathered[y*width+x] = Math.round(255 * (1 - bgN/9));
      }
    }

    // ── 7. Write RGBA output (transparent background) ─────────────────────
    for (let i = 0; i < width * height; i++) {
      result.data[i*4]   = data[i*4];
      result.data[i*4+1] = data[i*4+1];
      result.data[i*4+2] = data[i*4+2];
      result.data[i*4+3] = feathered[i];
    }
    return result;
  }

  /** Render transparent ImageData → PNG dataURL (alpha preserved) */
  imageDataToPng(imageData: ImageData, size = 600): string {
    const src = document.createElement('canvas');
    src.width = imageData.width; src.height = imageData.height;
    src.getContext('2d')!.putImageData(imageData, 0, 0);

    const out = document.createElement('canvas');
    out.width = out.height = size;
    const ctx = out.getContext('2d')!;
    ctx.clearRect(0, 0, size, size); // transparent background

    const scale = Math.min(size / src.width, size / src.height);
    const dw = src.width * scale, dh = src.height * scale;
    ctx.drawImage(src, (size-dw)/2, (size-dh)/2, dw, dh);

    return out.toDataURL('image/png'); // PNG keeps alpha channel
  }

  async resizeForStorage(dataUrl: string, maxPx = 800): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    });
  }

  /** Extract colors — ONLY from non-transparent pixels (alpha > 200) */
  extractColors(imageData: ImageData, count = 3): string[] {
    const centroids = kMeans(imageData.data, count + 1);
    const names = centroids.map(([r,g,b]) => nearestColorName(Math.round(r), Math.round(g), Math.round(b)));
    const unique = [...new Set(names)];
    return unique.slice(0, count).length > 0 ? unique.slice(0, count) : ['Gray'];
  }

  /** Detect pattern — skips transparent pixels */
  detectPattern(imageData: ImageData): PatternType {
    const { data, width, height } = imageData;
    const bSize = 8;
    const vars: number[] = [], rowVars: number[] = [];

    for (let by = 0; by < height - bSize; by += bSize) {
      let rowSum = 0;
      for (let bx = 0; bx < width - bSize; bx += bSize) {
        const grays: number[] = [];
        for (let y = by; y < by+bSize; y++) for (let x = bx; x < bx+bSize; x++) {
          const i = (y*width+x)*4;
          if (data[i+3] < 200) continue; // clothing pixels only
          grays.push(0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]);
        }
        if (grays.length < 20) continue;
        const mean = grays.reduce((s,v) => s+v, 0) / grays.length;
        const v    = grays.reduce((s,v) => s+(v-mean)**2, 0) / grays.length;
        vars.push(v); rowSum += v;
      }
      rowVars.push(rowSum);
    }
    if (!vars.length) return 'Solid';

    const avg = vars.reduce((s,v) => s+v, 0) / vars.length;
    const highRatio = vars.filter(v => v > avg*1.6).length / vars.length;
    let periodic = 0;
    for (let i = 2; i < rowVars.length; i++) {
      if (Math.abs(rowVars[i] - rowVars[i-2]) < rowVars[i]*0.25) periodic++;
    }
    const periodicity = rowVars.length > 2 ? periodic/(rowVars.length-2) : 0;

    if (avg < 180)                       return 'Solid';
    if (periodicity > 0.65 && avg > 350) return 'Striped';
    if (highRatio > 0.45 && avg > 500)   return 'Checkered';
    if (highRatio > 0.28 && avg > 280)   return 'Floral';
    if (avg > 650)                       return 'Graphic';
    return 'Solid';
  }

  detectClothingType(imageData: ImageData): { type: ClothingType; confidence: number } {
    const { data, width, height } = imageData;
    let minX = width, maxX = 0, minY = height, maxY = 0, fg = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y*width+x)*4;
      if (data[i+3] > 128) {
        minX=Math.min(minX,x); maxX=Math.max(maxX,x);
        minY=Math.min(minY,y); maxY=Math.max(maxY,y); fg++;
      }
    }
    const cw = (maxX-minX)||width, ch = (maxY-minY)||height;
    const ar = ch/cw, coverage = fg/(width*height);

    const mid = Math.floor(height/2);
    let ts=0,bs=0,tn=0,bn=0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y*width+x)*4;
      if (data[i+3] < 128) continue;
      const lum = (data[i]+data[i+1]+data[i+2])/3;
      if (y < mid) { ts+=lum; tn++; } else { bs+=lum; bn++; }
    }
    const tA = ts/(tn||1), bA = bs/(bn||1);

    if (ar > 2.2)  return { type: 'Dress',  confidence: 0.65 };
    if (ar > 1.7)  return tA > bA+25 ? { type: 'Pants',  confidence: 0.58 } : { type: 'Jeans',  confidence: 0.58 };
    if (ar > 1.2)  return coverage > 0.60 ? { type: 'Coat', confidence: 0.52 } : { type: 'Jacket', confidence: 0.52 };
    if (ar < 0.55) return { type: 'Shorts', confidence: 0.55 };
    if (ar < 0.75) return tA > bA+20 ? { type: 'Skirt', confidence: 0.50 } : { type: 'Shorts', confidence: 0.50 };
    return tA > bA+15 ? { type: 'Shirt', confidence: 0.48 } : { type: 'T-shirt', confidence: 0.50 };
  }

  detectSeason(type: ClothingType): SeasonType {
    const map: Record<ClothingType, SeasonType> = {
      'T-shirt':'Summer','Shirt':'All-Season','Hoodie':'Winter',
      'Jacket':'Winter','Coat':'Winter','Pants':'All-Season',
      'Jeans':'All-Season','Shorts':'Summer','Skirt':'Summer','Dress':'Summer',
    };
    return map[type] ?? 'All-Season';
  }

  classifyStyle(type: ClothingType, colors: string[]): StyleType {
    const neutrals = new Set(['Black','White','Gray','Beige','Navy']);
    const isN = colors.some(c => neutrals.has(c));
    const map: Record<ClothingType, StyleType> = {
      'T-shirt':'Casual','Shirt':isN?'Formal':'Casual','Hoodie':'Streetwear',
      'Jacket':'Streetwear','Coat':'Formal','Pants':isN?'Formal':'Casual',
      'Jeans':'Casual','Shorts':'Sport','Skirt':'Casual','Dress':'Formal',
    };
    return map[type] ?? 'Casual';
  }

  async analyze(dataUrl: string): Promise<ClothingAnalysis> {
    const { imageData }    = await this.preprocessImage(dataUrl);
    const cleanImageData   = this.removeBackground(imageData);       // transparent ImageData
    const processedImageUrl = this.imageDataToPng(cleanImageData, 600); // PNG with alpha
    const { type, confidence } = this.detectClothingType(cleanImageData);
    const colors           = this.extractColors(cleanImageData, 3);  // clothing pixels only
    const pattern          = this.detectPattern(cleanImageData);     // clothing pixels only
    const style            = this.classifyStyle(type, colors);
    const season           = this.detectSeason(type);
    const originalImageUrl = await this.resizeForStorage(dataUrl, 800);

    return { type, pattern, colors, style, season, confidence, processedImageUrl, originalImageUrl };
  }

  generateOutfits(items: WardrobeItem[]): OutfitSuggestion[] {
    const avail    = items.filter(i => i.location === 'Closet' || i.location === 'Ready to Wear');
    const tops     = avail.filter(i => ['T-shirt','Shirt','Hoodie'].includes(i.type));
    const outer    = avail.filter(i => ['Jacket','Coat'].includes(i.type));
    const bottoms  = avail.filter(i => ['Pants','Jeans','Shorts','Skirt'].includes(i.type));
    const dresses  = avail.filter(i => i.type === 'Dress');

    const rules = [
      { t:'T-shirt', b:'Jeans',  s:'Casual'     as StyleType, d:'Classic casual everyday look'  },
      { t:'T-shirt', b:'Shorts', s:'Sport'      as StyleType, d:'Summer sport outfit'            },
      { t:'T-shirt', b:'Pants',  s:'Casual'     as StyleType, d:'Relaxed daily outfit'           },
      { t:'Shirt',   b:'Pants',  s:'Formal'     as StyleType, d:'Sharp formal look'              },
      { t:'Shirt',   b:'Jeans',  s:'Casual'     as StyleType, d:'Smart casual look'              },
      { t:'Hoodie',  b:'Jeans',  s:'Streetwear' as StyleType, d:'Urban streetwear look'          },
      { t:'Hoodie',  b:'Pants',  s:'Homewear'   as StyleType, d:'Comfortable homewear'           },
      { t:'Shirt',   b:'Skirt',  s:'Casual'     as StyleType, d:'Feminine casual look'           },
    ];

    const outfits: OutfitSuggestion[] = [];
    let id = 1;
    for (const r of rules) {
      const mt = tops.filter(x => x.type === r.t);
      const mb = bottoms.filter(x => x.type === r.b);
      if (!mt.length || !mb.length) continue;
      const its: WardrobeItem[] = [mt[0], mb[0]];
      if ((r.s === 'Formal' || r.s === 'Streetwear') && outer.length) its.push(outer[0]);
      outfits.push({ id: String(id++), style: r.s, description: r.d, items: its });
      if (outfits.length >= 8) break;
    }
    for (const dr of dresses.slice(0,3)) {
      outfits.push({ id: String(id++), style: 'Formal', description: 'Elegant dress look', items: [dr] });
    }
    return outfits;
  }

  findSimilarItem(analysis: ClothingAnalysis, wardrobe: WardrobeItem[]): WardrobeItem | null {
    const byType = wardrobe.filter(i => i.type === analysis.type);
    if (!byType.length) return null;
    let best: WardrobeItem | null = null, bestScore = -1;
    for (const item of byType) {
      const cols = Array.isArray(item.colors) ? item.colors : [];
      const score = analysis.colors.filter(c => cols.includes(c)).length / Math.max(analysis.colors.length, 1);
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return best;
  }
}

export const smartClosetEngine = new SmartClosetVisionEngine();
