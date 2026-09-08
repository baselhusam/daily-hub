/**
 * Project accents are derived from logos, so they land wherever the logo
 * happens to sit — and a fair number of them are unreadable as chart marks.
 * Three of the current set fall under 2:1 against white, and two greens are
 * close enough that a full-colour reader can't separate them.
 *
 * These helpers map an accent to a *plot* colour: same hue, lightness and
 * chroma pulled into a band that reads on the chart surface. The stored
 * colour is never touched — avatars, badges and project cards keep the real
 * accent, and only the chart substitutes.
 */

export type ChartThemeMode = "light" | "dark";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** OKLCH lightness window per surface. Outside it, marks wash out or go muddy. */
const BAND: Record<ChartThemeMode, [number, number]> = {
  light: [0.45, 0.72],
  dark: [0.52, 0.655],
};
/** Below this a hue reads as grey; above it, neighbouring hues start to shout. */
const CHROMA_FLOOR = 0.12;
const CHROMA_CEILING = 0.2;
/** An accent this close to grey is meant to be grey (the inbox bucket). */
const NEUTRAL_CHROMA = 0.02;

const SURFACE: Record<ChartThemeMode, [number, number, number]> = {
  light: [255, 255, 255],
  dark: [33, 31, 28],
};

type Rgb = [number, number, number];

function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toSrgb(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb): string {
  return (
    "#" +
    [r, g, b]
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
      .toUpperCase()
  );
}

type Oklch = { l: number; c: number; h: number };

function hexToOklch(hex: string): Oklch {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = toLinear(r8 / 255);
  const g = toLinear(g8 / 255);
  const b = toLinear(b8 / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    l: okL,
    c: Math.hypot(okA, okB),
    h: ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360,
  };
}

/** Linear-light sRGB for an OKLCH triple; components may fall outside 0..1. */
function oklchToLinearRgb({ l: okL, c, h }: Oklch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);

  const l = (okL + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (okL - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (okL - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(rgb: Rgb): boolean {
  return rgb.every((channel) => channel >= -0.0001 && channel <= 1.0001);
}

/**
 * Converts to a hex, reducing chroma until the colour fits in sRGB. Clamping
 * the channels instead would shift the hue, which is the one property that has
 * to survive — it is what ties the mark to the project's avatar.
 */
function oklchToHex(color: Oklch): string {
  let low = 0;
  let high = color.c;
  let best = oklchToLinearRgb({ ...color, c: 0 });

  if (inGamut(oklchToLinearRgb(color))) {
    best = oklchToLinearRgb(color);
  } else {
    for (let step = 0; step < 24; step += 1) {
      const mid = (low + high) / 2;
      const candidate = oklchToLinearRgb({ ...color, c: mid });
      if (inGamut(candidate)) {
        best = candidate;
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return rgbToHex(best.map((channel) => toSrgb(Math.max(0, Math.min(1, channel))) * 255) as Rgb);
}

/**
 * The colour to draw a project's line or band with on a chart surface.
 * Hue is preserved exactly; lightness and chroma are pulled into range.
 */
export function plotColor(accent: string, mode: ChartThemeMode): string {
  if (!HEX_COLOR.test(accent)) return accent;

  const color = hexToOklch(accent);
  const [floor, ceiling] = BAND[mode];
  const lightness = Math.min(ceiling, Math.max(floor, color.l));

  // A deliberately neutral accent stays neutral rather than being forced to
  // invent a hue it never had.
  if (color.c < NEUTRAL_CHROMA) {
    return oklchToHex({ l: lightness, c: 0, h: color.h });
  }

  return oklchToHex({
    l: lightness,
    c: Math.min(CHROMA_CEILING, Math.max(CHROMA_FLOOR, color.c)),
    h: color.h,
  });
}

/**
 * Pushes a colour back toward the card surface. Context lines use this so they
 * keep their own hue — seven identical greys read as one anonymous thicket,
 * where seven pale hues stay recognisable and can snap forward on hover.
 */
export function recedeColor(hex: string, mode: ChartThemeMode, amount: number): string {
  if (!HEX_COLOR.test(hex)) return hex;
  const surface = SURFACE[mode];
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map((channel, index) => channel + (surface[index] - channel) * amount) as Rgb);
}

/** Circular hue distance in degrees; -1 for a neutral, which never collides. */
export function plotHue(hex: string): number {
  if (!HEX_COLOR.test(hex)) return -1;
  const color = hexToOklch(hex);
  return color.c < NEUTRAL_CHROMA ? -1 : color.h;
}
