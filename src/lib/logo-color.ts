export type Rgb = { r: number; g: number; b: number };

type Hsl = { h: number; s: number; l: number };

type BucketAgg = { count: number; rSum: number; gSum: number; bSum: number };

function averageRgb(bucket: BucketAgg): Rgb {
  return {
    r: Math.round(bucket.rSum / bucket.count),
    g: Math.round(bucket.gSum / bucket.count),
    b: Math.round(bucket.bSum / bucket.count),
  };
}

/** Circular hue distance in degrees, wrapping at 360 (e.g. 350 vs 10 is 20 apart). */
function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Greedily folds buckets into clusters in descending pixel-count order, so a
 * bucket joins the largest close-enough cluster it finds rather than starting
 * a new one — this is what turns "N shades of the same blue" into one colour.
 */
function clusterBuckets(buckets: BucketAgg[]): Array<{ color: Rgb; weight: number }> {
  const sorted = [...buckets].sort((a, b) => b.count - a.count);
  const clusters: BucketAgg[] = [];

  for (const bucket of sorted) {
    const bucketHsl = rgbToHsl(averageRgb(bucket));
    const match = clusters.find((cluster) => {
      const clusterHsl = rgbToHsl(averageRgb(cluster));
      return (
        hueDistance(bucketHsl.h, clusterHsl.h) <= 22 &&
        Math.abs(bucketHsl.l - clusterHsl.l) <= 0.22 &&
        Math.abs(bucketHsl.s - clusterHsl.s) <= 0.3
      );
    });

    if (match) {
      match.count += bucket.count;
      match.rSum += bucket.rSum;
      match.gSum += bucket.gSum;
      match.bSum += bucket.bSum;
    } else {
      clusters.push({ ...bucket });
    }
  }

  return clusters
    .map((cluster) => ({ color: averageRgb(cluster), weight: cluster.count }))
    .sort((a, b) => b.weight - a.weight);
}

/** Ranked distinct colors in an image, most-used first. */
export function rankLogoColors(
  pixels: Uint8ClampedArray,
  options?: { minAlpha?: number }
): Array<{ color: Rgb; weight: number }> {
  const minAlpha = options?.minAlpha ?? 128;
  const buckets = new Map<number, BucketAgg>();

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < minAlpha) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // 5-bit-per-channel quantization (32 levels) so near-identical pixels
    // share a bucket before we get to perceptual clustering.
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    const existing = buckets.get(key);
    if (existing) {
      existing.count++;
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
    } else {
      buckets.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  const chromatic: BucketAgg[] = [];
  const neutral: BucketAgg[] = [];

  for (const bucket of buckets.values()) {
    const { s, l } = rgbToHsl(averageRgb(bucket));
    // Background paper, near-black chrome, and anti-aliasing haze are not
    // "colours" in the sense the caller wants — keep them out of the main
    // ranking but still usable for pure-greyscale logos.
    if (l > 0.93 || l < 0.07 || s < 0.12) neutral.push(bucket);
    else chromatic.push(bucket);
  }

  const chromaticRanked = clusterBuckets(chromatic);
  if (chromaticRanked.length > 0) return chromaticRanked;
  return clusterBuckets(neutral);
}

/**
 * How much a cluster reads as the logo's actual mark: vivid, mid-toned, and
 * present in real quantity. Rank alone is not enough in either direction — a
 * dark navy backdrop clears the neutral filter and can hold 88% of the pixels,
 * while the pale halo around an anti-aliased mark is saturated enough to
 * outrank the mark it surrounds.
 */
function markScore(color: Rgb, share: number): number {
  const { s, l } = rgbToHsl(color);
  // Peaks at l = 0.5, which pushes away both the near-black backdrop and the
  // washed-out fringe — they sit at opposite ends of the lightness range.
  const tone = Math.max(0, 1 - Math.abs(l - 0.5) / 0.5);
  // Sub-linear, so a dominant but dull region cannot simply outvote the mark,
  // and a 1%-of-pixels fringe cannot win on vividness alone either.
  return s * tone * Math.pow(share, 0.35);
}

/** The project accent: the color that reads as the logo's mark, normalized for UI use. */
export function pickLogoAccentColor(pixels: Uint8ClampedArray): string | null {
  const ranked = rankLogoColors(pixels);
  if (ranked.length === 0) return null;

  const total = ranked.reduce((sum, entry) => sum + entry.weight, 0);

  let best = ranked[0];
  let bestScore = -1;
  for (const entry of ranked) {
    const score = markScore(entry.color, entry.weight / total);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return normalizeAccent(toHex(best.color));
}

/**
 * The colour of a single pixel in an RGBA buffer, addressed in image space.
 * Returns null outside the image; `alpha` is passed through so callers can
 * treat a transparent pixel as "no colour here" rather than as black.
 */
export function pixelAt(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): { hex: string; alpha: number } | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width) return null;

  const index = (py * width + px) * 4;
  if (index < 0 || index + 3 >= pixels.length) return null;

  return {
    hex: toHex({ r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] }),
    alpha: pixels[index + 3],
  };
}

/**
 * Black or white, whichever stays legible drawn on top of `hex` — used for the
 * glyphs we overlay on a colour swatch, which can be anything the user picks.
 */
export function readableInkOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.45 ? "#111111" : "#FFFFFF";
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

/** Clamp any hex so it reads on both light and dark surfaces. */
export function normalizeAccent(hex: string): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return toHex(
    hslToRgb({
      h: hsl.h,
      s: Math.min(0.85, Math.max(0.35, hsl.s)),
      l: Math.min(0.66, Math.max(0.38, hsl.l)),
    })
  );
}

/** Stable palette color when there is no logo (icon-only projects). */
export const FALLBACK_PALETTE = [
  "#2383E2",
  "#E2683A",
  "#17A67B",
  "#A855C7",
  "#D9A32B",
  "#E2536B",
  "#3FA9C9",
  "#7C8CF8",
  "#B4762E",
  "#4FA02F",
] as const;

function fnv1aHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function fallbackColorFor(seed: string): string {
  const hash = fnv1aHash(seed);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

// --- exported for tests ---

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / delta + 2) * 60;
  else h = ((rn - gn) / delta + 4) * 60;

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hueToChannel = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = (((h % 360) + 360) % 360) / 360;

  return {
    r: Math.round(hueToChannel(p, q, hn + 1 / 3) * 255),
    g: Math.round(hueToChannel(p, q, hn) * 255),
    b: Math.round(hueToChannel(p, q, hn - 1 / 3) * 255),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}
