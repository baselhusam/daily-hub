import { describe, expect, it } from "vitest";
import {
  MOMENTUM_LEGEND_STEPS,
  momentumTextColor,
  momentumTileBorder,
  momentumTileColor,
  momentumTone,
} from "./momentum-colors";

describe("momentumTone", () => {
  it("separates a day with nothing due from a day where nothing got done", () => {
    expect(momentumTone(null)).toBe("off");
    expect(momentumTone(0)).toBe("missed");
    expect(momentumTileColor(null)).not.toBe(momentumTileColor(0));
  });

  it("rises monotonically through the partial tiers", () => {
    expect(momentumTone(0.1)).toBe("low");
    expect(momentumTone(0.4)).toBe("medium");
    expect(momentumTone(0.74)).toBe("medium");
    expect(momentumTone(0.75)).toBe("high");
    expect(momentumTone(1)).toBe("complete");
  });

  it("gives every tier its own colour", () => {
    const colors = [null, 0, 0.2, 0.5, 0.85, 1].map(momentumTileColor);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("momentum text and borders", () => {
  it("never paints summary text in a tile colour", () => {
    for (const ratio of [null, 0, 0.5, 1]) {
      expect(momentumTextColor(ratio)).not.toBe(momentumTileColor(ratio));
    }
  });

  it("outlines only the near-invisible off tiles", () => {
    expect(momentumTileBorder(null)).toBe("var(--rule-soft)");
    expect(momentumTileBorder(0)).toBe("transparent");
  });
});

describe("legend", () => {
  it("walks the partial ramp without repeating a swatch", () => {
    const colors = MOMENTUM_LEGEND_STEPS.map((step) => momentumTileColor(step.ratio));
    expect(new Set(colors).size).toBe(colors.length);
  });
});
