import { describe, expect, it } from "vitest";
import { plotColor, plotHue, recedeColor } from "@/lib/chart-colors";

/** WCAG relative luminance, for the contrast assertions below. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe("plotColor", () => {
  it("leaves an accent that is already in band untouched", () => {
    // DailyHub's own blue sits mid-band on both surfaces.
    expect(plotColor("#2283E2", "light")).toBe("#2283E2");
  });

  it("darkens accents that are too light to read on white", () => {
    // These three are the real offenders: 1.4:1, 1.6:1 and 1.8:1 on white.
    for (const accent of ["#CBE713", "#13E784", "#1FD2F1"]) {
      expect(contrast(accent, "#FFFFFF")).toBeLessThan(2);
      expect(contrast(plotColor(accent, "light"), "#FFFFFF")).toBeGreaterThan(2);
    }
  });

  it("preserves hue, which is what ties a mark to its project avatar", () => {
    for (const accent of ["#CBE713", "#13E784", "#1FD2F1", "#5E33EE"]) {
      const shifted = Math.abs(plotHue(plotColor(accent, "light")) - plotHue(accent));
      expect(Math.min(shifted, 360 - shifted)).toBeLessThan(4);
    }
  });

  it("keeps a neutral accent neutral instead of inventing a hue", () => {
    const neutral = plotColor("#8B8A86", "light");
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(neutral.slice(offset, offset + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(2);
  });

  it("returns a value in sRGB range for an out-of-gamut request", () => {
    // #5E33EE at full chroma leaves sRGB once its lightness is raised.
    expect(plotColor("#5E33EE", "light")).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("passes through anything that is not a six-digit hex", () => {
    expect(plotColor("var(--foreground)", "light")).toBe("var(--foreground)");
  });
});

describe("recedeColor", () => {
  it("moves a colour toward white on the light surface", () => {
    const receded = recedeColor("#2283E2", "light", 0.62);
    expect(luminance(receded)).toBeGreaterThan(luminance("#2283E2"));
  });

  it("moves a colour toward the card on the dark surface", () => {
    const receded = recedeColor("#6BAEE9", "dark", 0.62);
    expect(luminance(receded)).toBeLessThan(luminance("#6BAEE9"));
  });

  it("is a no-op at zero and reaches the surface at one", () => {
    expect(recedeColor("#2283E2", "light", 0)).toBe("#2283E2");
    expect(recedeColor("#2283E2", "light", 1)).toBe("#FFFFFF");
  });
});
