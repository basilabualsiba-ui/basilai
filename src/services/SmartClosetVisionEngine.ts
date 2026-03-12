/**
 * SmartClosetVisionEngine
 * Fully local, offline-capable clothing analysis engine.
 * Uses canvas-based image processing — no external APIs.
 *
 * Modules: ImageCaptureModule · BackgroundRemovalModule · ClothingDetectionModule
 *          ClothingClassifier · PatternDetector · ColorExtractor
 *          SeasonRuleEngine · OutfitGenerator · LaundryManagementSystem
 *          ClothingScannerLookup
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
  processedImageUrl: string;
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
// Named colors with perceptual RGB reference values

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

// Weighted Euclidean distance (human perceptual model)
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

// ─── K-Means Color Clustering ─────────────────────────────────────────────────
// Pure JS implementation of k-means for dominant color extraction

function kMeans(pixels: Uint8ClampedArray, k: number): [number, number, number][] {
  const samples: [number, number, number][] = [];

  // Sample every 8th pixel, skip near-transparent and extreme values
  for (let i = 0; i < pixels.length; i += 32) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
    if (a < 120) continue; // transparent
    samples.push([r, g, b]);
  }

  if (samples.length < k) return [[128, 128, 128]];

  // Init centroids evenly spread
  const step = Math.floor(samples.length / k);
  let centroids: [number, number, number][] = Array.from({ length: k }, (_, i) => [...samples[i * step]] as [number, number, number]);

  for (let iter = 0; iter < 20; iter++) {
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
      if (cluster.length === 0) return centroids[i];
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

  return centroids;
}

// ─── SmartClosetVisionEngine ──────────────────────────────────────────────────

export class SmartClosetVisionEngine {
  private readonly MODEL_SIZE = 224; // MobileNet input spec

  // ── ImageCaptureModule ──────────────────────────────────────────────────────
  // Returns a Promise<string> (dataURL) from file input or camera
  readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── ImagePreprocessing ──────────────────────────────────────────────────────
  // Resize to 224×224 and return ImageData (tensor-ready)
  async preprocessImage(dataUrl: string): Promise<{ canvas: HTMLCanvasElement; imageData: ImageData }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.MODEL_SIZE;
        canvas.height = this.MODEL_SIZE;
        const ctx = canvas.getContext('2d')!;
        // Normalize aspect via letterbox fill
        const scale = Math.min(this.MODEL_SIZE / img.width, this.MODEL_SIZE / img.height);
        const w = img.width * scale, h = img.height * scale;
        const ox = (this.MODEL_SIZE - w) / 2, oy = (this.MODEL_SIZE - h) / 2;
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, this.MODEL_SIZE, this.MODEL_SIZE);
        ctx.drawImage(img, ox, oy, w, h);
        resolve({ canvas, imageData: ctx.getImageData(0, 0, this.MODEL_SIZE, this.MODEL_SIZE) });
      };
      img.src = dataUrl;
    });
  }

  // Resize for DB storage (max 800px, JPEG 0.82)
  async resizeForStorage(dataUrl: string, maxPx = 800): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = dataUrl;
    });
  }

  // ── BackgroundRemovalModule ─────────────────────────────────────────────────
  // Corner-sampling background detection + alpha-mask
  removeBackground(imageData: ImageData): ImageData {
    const { data, width, height } = imageData;
    const result = new ImageData(width, height);
    const px = data;

    // Sample 8 corner/edge points for background color
    const pts = [
      [0,0],[width-1,0],[0,height-1],[width-1,height-1],
      [width>>1,0],[0,height>>1],[width-1,height>>1],[width>>1,height-1],
    ];
    let sr = 0, sg = 0, sb = 0;
    for (const [x,y] of pts) {
      const i = (y * width + x) * 4;
      sr += px[i]; sg += px[i+1]; sb += px[i+2];
    }
    const bgR = sr / pts.length, bgG = sg / pts.length, bgB = sb / pts.length;
    const threshold = 50;

    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i+1], b = px[i+2];
      result.data[i]   = r;
      result.data[i+1] = g;
      result.data[i+2] = b;
      result.data[i+3] = colorDist(r, g, b, bgR, bgG, bgB) < threshold ? 0 : 255;
    }
    return result;
  }

  // ── ColorExtractor ──────────────────────────────────────────────────────────
  // K-means on clothing region → named color labels
  extractColors(imageData: ImageData, count = 3): string[] {
    const centroids = kMeans(imageData.data, count + 1);
    const names = centroids.map(([r,g,b]) => nearestColorName(Math.round(r), Math.round(g), Math.round(b)));
    // Deduplicate, remove extreme whites
    const unique = [...new Set(names)].filter((n, idx) => !(n === 'White' && idx > 0));
    return unique.slice(0, count).length > 0 ? unique.slice(0, count) : ['Gray'];
  }

  // ── PatternDetector ─────────────────────────────────────────────────────────
  // Block-level variance analysis to detect texture/pattern
  detectPattern(imageData: ImageData): PatternType {
    const { data, width, height } = imageData;
    const bSize = 8;
    const vars: number[] = [];
    const rowVars: number[] = [];

    for (let by = 0; by < height - bSize; by += bSize) {
      let rowSum = 0;
      for (let bx = 0; bx < width - bSize; bx += bSize) {
        const grays: number[] = [];
        for (let y = by; y < by + bSize; y++) {
          for (let x = bx; x < bx + bSize; x++) {
            const i = (y * width + x) * 4;
            if (data[i+3] < 128) continue; // skip transparent
            grays.push(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
          }
        }
        if (grays.length < 4) continue;
        const mean = grays.reduce((s,v) => s+v, 0) / grays.length;
        const variance = grays.reduce((s,v) => s + (v-mean)**2, 0) / grays.length;
        vars.push(variance);
        rowSum += variance;
      }
      rowVars.push(rowSum);
    }

    if (vars.length === 0) return 'Solid';

    const avg = vars.reduce((s,v) => s+v, 0) / vars.length;
    const high = vars.filter(v => v > avg * 1.6).length;
    const highRatio = high / vars.length;

    // Row periodicity check (stripes have alternating high/low variance rows)
    let periodic = 0;
    for (let i = 2; i < rowVars.length; i++) {
      const diff = Math.abs(rowVars[i] - rowVars[i-2]);
      if (diff < rowVars[i] * 0.25) periodic++;
    }
    const periodicity = rowVars.length > 2 ? periodic / (rowVars.length - 2) : 0;

    if (avg < 180)               return 'Solid';
    if (periodicity > 0.65 && avg > 350) return 'Striped';
    if (highRatio > 0.45 && avg > 500)   return 'Checkered';
    if (highRatio > 0.28 && avg > 280)   return 'Floral';
    if (avg > 650)               return 'Graphic';
    return 'Solid';
  }

  // ── ClothingDetectionModule + ClothingClassifier ────────────────────────────
  // Heuristic type detection using aspect ratio, bounding box, brightness distribution
  detectClothingType(imageData: ImageData): { type: ClothingType; confidence: number } {
    const { data, width, height } = imageData;

    // Find foreground bounding box
    let minX = width, maxX = 0, minY = height, maxY = 0, fg = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i+3] > 128) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          fg++;
        }
      }
    }

    const cw = (maxX - minX) || width;
    const ch = (maxY - minY) || height;
    const ar = ch / cw; // aspect ratio: tall = >1.2
    const coverage = fg / (width * height);

    // Upper-half vs lower-half brightness
    const mid = Math.floor(height / 2);
    let topSum = 0, botSum = 0, topN = 0, botN = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum = (data[i] + data[i+1] + data[i+2]) / 3;
        if (y < mid) { topSum += lum; topN++; }
        else { botSum += lum; botN++; }
      }
    }
    const topAvg = topSum / (topN || 1);
    const botAvg = botSum / (botN || 1);

    // Classification rules
    if (ar > 2.2)  return { type: 'Dress', confidence: 0.65 };
    if (ar > 1.7) {
      return topAvg > botAvg + 25
        ? { type: 'Pants',  confidence: 0.58 }
        : { type: 'Jeans',  confidence: 0.58 };
    }
    if (ar > 1.2) {
      return coverage > 0.60
        ? { type: 'Coat',    confidence: 0.52 }
        : { type: 'Jacket',  confidence: 0.52 };
    }
    if (ar < 0.55) return { type: 'Shorts', confidence: 0.55 };
    if (ar < 0.75) {
      return topAvg > botAvg + 20
        ? { type: 'Skirt',   confidence: 0.50 }
        : { type: 'Shorts',  confidence: 0.50 };
    }

    // Roughly square → top garment
    return topAvg > botAvg + 15
      ? { type: 'Shirt',   confidence: 0.48 }
      : { type: 'T-shirt', confidence: 0.50 };
  }

  // ── SeasonRuleEngine ────────────────────────────────────────────────────────
  detectSeason(type: ClothingType): SeasonType {
    const rules: Record<ClothingType, SeasonType> = {
      'T-shirt': 'Summer',
      'Shirt':   'All-Season',
      'Hoodie':  'Winter',
      'Jacket':  'Winter',
      'Coat':    'Winter',
      'Pants':   'All-Season',
      'Jeans':   'All-Season',
      'Shorts':  'Summer',
      'Skirt':   'Summer',
      'Dress':   'Summer',
    };
    return rules[type] ?? 'All-Season';
  }

  // ── StyleClassifier ─────────────────────────────────────────────────────────
  classifyStyle(type: ClothingType, colors: string[]): StyleType {
    const neutrals = new Set(['Black','White','Gray','Beige','Navy']);
    const isNeutral = colors.some(c => neutrals.has(c));

    const rules: Record<ClothingType, StyleType> = {
      'T-shirt': 'Casual',
      'Shirt':   isNeutral ? 'Formal' : 'Casual',
      'Hoodie':  'Streetwear',
      'Jacket':  'Streetwear',
      'Coat':    'Formal',
      'Pants':   isNeutral ? 'Formal' : 'Casual',
      'Jeans':   'Casual',
      'Shorts':  'Sport',
      'Skirt':   'Casual',
      'Dress':   'Formal',
    };
    return rules[type] ?? 'Casual';
  }

  // ── Main Analysis Pipeline ──────────────────────────────────────────────────
  async analyze(dataUrl: string): Promise<ClothingAnalysis> {
    // Step 1: Preprocess to 224×224 tensor
    const { imageData } = await this.preprocessImage(dataUrl);

    // Step 2: Remove background
    const clean = this.removeBackground(imageData);

    // Step 3: Detect clothing type from cleaned image
    const { type, confidence } = this.detectClothingType(clean);

    // Step 4: Extract dominant colors from cleaned clothing region
    const colors = this.extractColors(clean, 3);

    // Step 5: Detect pattern (use original texture, not cleaned)
    const pattern = this.detectPattern(imageData);

    // Step 6: Rule-based style + season
    const style  = this.classifyStyle(type, colors);
    const season = this.detectSeason(type);

    // Step 7: Compress image for storage
    const processedImageUrl = await this.resizeForStorage(dataUrl);

    return { type, pattern, colors, style, season, confidence, processedImageUrl };
  }

  // ── OutfitGenerator ─────────────────────────────────────────────────────────
  // Rule-based outfit combinations from available (Closet/Ready) items only
  generateOutfits(items: WardrobeItem[]): OutfitSuggestion[] {
    const available = items.filter(i => i.location === 'Closet' || i.location === 'Ready to Wear');

    const tops      = available.filter(i => ['T-shirt','Shirt','Hoodie'].includes(i.type));
    const outerwear = available.filter(i => ['Jacket','Coat'].includes(i.type));
    const bottoms   = available.filter(i => ['Pants','Jeans','Shorts','Skirt'].includes(i.type));
    const dresses   = available.filter(i => i.type === 'Dress');

    const rules: { topType: string; bottomType: string; style: StyleType; desc: string }[] = [
      { topType: 'T-shirt', bottomType: 'Jeans',   style: 'Casual',    desc: 'Classic casual everyday look' },
      { topType: 'T-shirt', bottomType: 'Shorts',  style: 'Sport',     desc: 'Summer sport outfit' },
      { topType: 'T-shirt', bottomType: 'Pants',   style: 'Casual',    desc: 'Relaxed daily outfit' },
      { topType: 'Shirt',   bottomType: 'Pants',   style: 'Formal',    desc: 'Sharp formal look' },
      { topType: 'Shirt',   bottomType: 'Jeans',   style: 'Casual',    desc: 'Smart casual look' },
      { topType: 'Hoodie',  bottomType: 'Jeans',   style: 'Streetwear',desc: 'Urban streetwear look' },
      { topType: 'Hoodie',  bottomType: 'Pants',   style: 'Homewear',  desc: 'Comfortable homewear' },
      { topType: 'Shirt',   bottomType: 'Skirt',   style: 'Casual',    desc: 'Feminine casual look' },
    ];

    const outfits: OutfitSuggestion[] = [];
    let id = 1;

    for (const rule of rules) {
      const matchTops    = tops.filter(t => t.type === rule.topType);
      const matchBottoms = bottoms.filter(b => b.type === rule.bottomType);
      if (!matchTops.length || !matchBottoms.length) continue;

      const outfitItems: WardrobeItem[] = [matchTops[0], matchBottoms[0]];
      if ((rule.style === 'Formal' || rule.style === 'Streetwear') && outerwear.length > 0) {
        outfitItems.push(outerwear[0]);
      }

      outfits.push({ id: String(id++), style: rule.style, description: rule.desc, items: outfitItems });
      if (outfits.length >= 8) break;
    }

    // Dresses as standalone outfits
    for (const dress of dresses.slice(0, 3)) {
      outfits.push({ id: String(id++), style: 'Formal', description: 'Elegant dress look', items: [dress] });
    }

    return outfits;
  }

  // ── ClothingScannerLookup ───────────────────────────────────────────────────
  // Find wardrobe item matching scanned clothing analysis
  findSimilarItem(analysis: ClothingAnalysis, wardrobe: WardrobeItem[]): WardrobeItem | null {
    const byType = wardrobe.filter(i => i.type === analysis.type);
    if (!byType.length) return null;

    let best: WardrobeItem | null = null;
    let bestScore = -1;

    for (const item of byType) {
      const itemColors = Array.isArray(item.colors) ? item.colors : [];
      const overlap = analysis.colors.filter(c => itemColors.includes(c)).length;
      const score = overlap / Math.max(analysis.colors.length, 1);
      if (score > bestScore) { bestScore = score; best = item; }
    }

    return best; // same type is always a reasonable match
  }
}

// Singleton instance
export const smartClosetEngine = new SmartClosetVisionEngine();
