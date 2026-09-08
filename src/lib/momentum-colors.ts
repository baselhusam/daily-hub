/**
 * One colour scale for every momentum tile, so a given day looks identical in
 * the Today card and in the expanded history calendar. They used to run two
 * near-but-not-quite-equal ramps, which made the same day change shade when you
 * opened the dialog.
 */

/** A day with nothing due reads as "off", not as "missed". */
export const MOMENTUM_OFF_COLOR = "var(--chart-off)";

export type MomentumTileTone =
  | "off"
  | "missed"
  | "low"
  | "medium"
  | "high"
  | "complete";

export function momentumTone(ratio: number | null): MomentumTileTone {
  if (ratio === null) return "off";
  if (ratio <= 0) return "missed";
  if (ratio >= 1) return "complete";
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

export function momentumTileColor(ratio: number | null): string {
  switch (momentumTone(ratio)) {
    case "off":
      return MOMENTUM_OFF_COLOR;
    case "missed":
      return "var(--track)";
    case "low":
      return "color-mix(in srgb, var(--chart-hit-soft) 45%, var(--track))";
    case "medium":
      return "var(--chart-hit-soft)";
    case "high":
      return "var(--signal)";
    case "complete":
      return "var(--done)";
  }
}

/**
 * Tiles for days with nothing due are almost the page colour, so they need a
 * hairline to stay visible as tiles at all.
 */
export function momentumTileBorder(ratio: number | null): string {
  return ratio === null ? "var(--rule-soft)" : "transparent";
}

/**
 * Summary lines used to be painted in the tile colour, which put 12px text in
 * `--chart-hit-soft` (under 2:1 against the card). Status now travels through a
 * dot; the words stay readable.
 */
export function momentumTextColor(ratio: number | null): string {
  return ratio === null ? "var(--faint)" : "var(--ink-soft)";
}

/** Swatch steps for the calendar legend, weakest first. Excludes "off". */
export const MOMENTUM_LEGEND_STEPS: Array<{ ratio: number; label: string }> = [
  { ratio: 0, label: "Nothing done" },
  { ratio: 0.2, label: "A little done" },
  { ratio: 0.5, label: "Half done" },
  { ratio: 0.85, label: "Almost done" },
];
