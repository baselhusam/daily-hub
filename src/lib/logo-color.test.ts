import { describe, expect, it } from "vitest";
import {
  FALLBACK_PALETTE,
  fallbackColorFor,
  normalizeAccent,
  pickLogoAccentColor,
  rankLogoColors,
  rgbToHsl,
  toHex,
  type Rgb,
} from "@/lib/logo-color";

const WHITE: Rgb = { r: 250, g: 250, b: 250 };
const BLUE: Rgb = { r: 40, g: 90, b: 210 };
const BLUE_NEAR: Rgb = { r: 60, g: 110, b: 200 }; // ~4° hue apart from BLUE, well under the 22° merge threshold
const ORANGE: Rgb = { r: 220, g: 120, b: 30 };
const GREEN: Rgb = { r: 40, g: 160, b: 90 };

/** Expands `[r, g, b, a, count]` rows into a flat RGBA pixel buffer. */
function px(rows: Array<[number, number, number, number, number]>): Uint8ClampedArray {
  const pixels: number[] = [];
  for (const [r, g, b, a, count] of rows) {
    for (let i = 0; i < count; i++) pixels.push(r, g, b, a);
  }
  return new Uint8ClampedArray(pixels);
}

describe("rankLogoColors", () => {
  it("drops white background pixels into the neutral bucket", () => {
    const pixels = px([
      [WHITE.r, WHITE.g, WHITE.b, 255, 60],
      [BLUE.r, BLUE.g, BLUE.b, 255, 25],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 10],
      [GREEN.r, GREEN.g, GREEN.b, 255, 5],
    ]);

    const ranked = rankLogoColors(pixels);

    expect(ranked.map((entry) => entry.color)).toEqual([BLUE, ORANGE, GREEN]);
  });

  it("merges near-identical hues into one cluster (regression guard)", () => {
    // Without merging, sorted-by-count order would be BLUE(25), ORANGE(20),
    // BLUE_NEAR(18), GREEN(10) — a buggy ranking would put BLUE_NEAR third.
    const pixels = px([
      [BLUE.r, BLUE.g, BLUE.b, 255, 25],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 20],
      [BLUE_NEAR.r, BLUE_NEAR.g, BLUE_NEAR.b, 255, 18],
      [GREEN.r, GREEN.g, GREEN.b, 255, 10],
    ]);

    const ranked = rankLogoColors(pixels);

    expect(ranked).toHaveLength(3);
    expect(ranked[0].weight).toBe(43); // BLUE + BLUE_NEAR merged
    expect(ranked[1].color).toEqual(ORANGE);
    expect(ranked[2].color).toEqual(GREEN);
  });

  it("falls back to ranking neutral colors when nothing is chromatic", () => {
    const pixels = px([
      [128, 128, 128, 255, 50],
      [90, 90, 90, 255, 30],
      [180, 180, 180, 255, 20],
    ]);

    const ranked = rankLogoColors(pixels);

    expect(ranked.length).toBeGreaterThan(0);
  });

  it("skips pixels below the alpha threshold", () => {
    const pixels = px([
      [BLUE.r, BLUE.g, BLUE.b, 10, 50],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 5],
    ]);

    const ranked = rankLogoColors(pixels);

    expect(ranked).toEqual([{ color: ORANGE, weight: 5 }]);
  });
});

describe("pickLogoAccentColor", () => {
  it("picks the 3rd distinct color, skipping background and the main mark", () => {
    const pixels = px([
      [WHITE.r, WHITE.g, WHITE.b, 255, 60],
      [BLUE.r, BLUE.g, BLUE.b, 255, 25],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 10],
      [GREEN.r, GREEN.g, GREEN.b, 255, 5],
    ]);

    expect(pickLogoAccentColor(pixels)).toBe(normalizeAccent(toHex(GREEN)));
  });

  it("picks the 2nd color when only two chromatic colors exist", () => {
    const pixels = px([
      [WHITE.r, WHITE.g, WHITE.b, 255, 60],
      [BLUE.r, BLUE.g, BLUE.b, 255, 25],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 15],
    ]);

    expect(pickLogoAccentColor(pixels)).toBe(normalizeAccent(toHex(ORANGE)));
  });

  it("picks green, not the second blue, once near-identical blues are merged", () => {
    const pixels = px([
      [BLUE.r, BLUE.g, BLUE.b, 255, 25],
      [ORANGE.r, ORANGE.g, ORANGE.b, 255, 20],
      [BLUE_NEAR.r, BLUE_NEAR.g, BLUE_NEAR.b, 255, 18],
      [GREEN.r, GREEN.g, GREEN.b, 255, 10],
    ]);

    expect(pickLogoAccentColor(pixels)).toBe(normalizeAccent(toHex(GREEN)));
  });

  it("returns null for an all-transparent image", () => {
    const pixels = px([[10, 10, 10, 0, 100]]);

    expect(pickLogoAccentColor(pixels)).toBeNull();
  });

  it("returns a grey-derived color, not null, for a pure greyscale logo", () => {
    const pixels = px([
      [128, 128, 128, 255, 50],
      [90, 90, 90, 255, 30],
      [180, 180, 180, 255, 20],
    ]);

    const accent = pickLogoAccentColor(pixels);

    expect(accent).not.toBeNull();
    expect(accent).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("returns null for an empty pixel buffer", () => {
    expect(pickLogoAccentColor(new Uint8ClampedArray(0))).toBeNull();
  });
});

describe("normalizeAccent", () => {
  it("clamps saturation and lightness into a band usable on both themes", () => {
    for (const hex of ["#000000", "#FFFFFF", "#808080", "#FF00FF"]) {
      const { s, l } = rgbToHsl(
        (() => {
          const normalized = normalizeAccent(hex).replace("#", "");
          return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16),
          };
        })()
      );

      // A small tolerance absorbs the 8-bit RGB round-trip (hslToRgb rounds
      // each channel to an integer before we convert back to HSL to check it).
      const eps = 0.01;
      expect(s).toBeGreaterThanOrEqual(0.35 - eps);
      expect(s).toBeLessThanOrEqual(0.85 + eps);
      expect(l).toBeGreaterThanOrEqual(0.38 - eps);
      expect(l).toBeLessThanOrEqual(0.66 + eps);
    }
  });

  it("returns an uppercase 6-digit hex", () => {
    expect(normalizeAccent("#123abc")).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("fallbackColorFor", () => {
  it("is deterministic for the same seed", () => {
    expect(fallbackColorFor("project-a")).toBe(fallbackColorFor("project-a"));
  });

  it("stays within FALLBACK_PALETTE", () => {
    for (const seed of ["a", "b", "project-1", "cuid-abc123", ""]) {
      expect(FALLBACK_PALETTE).toContain(fallbackColorFor(seed));
    }
  });

  it("spreads different seeds across the palette", () => {
    const colors = new Set(
      ["alpha", "beta", "gamma", "delta", "epsilon"].map(fallbackColorFor)
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
