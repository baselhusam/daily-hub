import { describe, expect, it } from "vitest";
import {
  buildLogoColorUpdate,
  sanitizeLogoColorResults,
  selectLogoColorCandidates,
} from "@/lib/logo-color-backfill";

const project = (overrides: Partial<{
  id: string;
  logoUrl: string | null;
  color: string | null;
  colorSource: string;
}> = {}) => ({
  id: "p1",
  logoUrl: "/uploads/logo.png",
  color: null,
  colorSource: "auto",
  ...overrides,
});

describe("selectLogoColorCandidates", () => {
  it("picks projects that have a logo but no colour yet", () => {
    expect(selectLogoColorCandidates([project()])).toEqual([
      { id: "p1", logoUrl: "/uploads/logo.png" },
    ]);
  });

  it("keeps remote logos, which resolve through the server proxy", () => {
    const remote = project({ logoUrl: "https://example.com/logo.png" });
    expect(selectLogoColorCandidates([remote])).toHaveLength(1);
  });

  it("skips a colour the user picked by hand", () => {
    const manual = project({ color: "#FF0000", colorSource: "manual" });
    expect(selectLogoColorCandidates([manual])).toEqual([]);
  });

  it("skips a manual project even if its colour was somehow cleared", () => {
    const manual = project({ color: null, colorSource: "manual" });
    expect(selectLogoColorCandidates([manual])).toEqual([]);
  });

  it("skips a project that already has an auto colour", () => {
    const filled = project({ color: "#123456", colorSource: "auto" });
    expect(selectLogoColorCandidates([filled])).toEqual([]);
  });

  it("leaves logo-less projects to the palette fallback", () => {
    expect(selectLogoColorCandidates([project({ logoUrl: null })])).toEqual([]);
  });
});

describe("sanitizeLogoColorResults", () => {
  it("upper-cases valid hex colours", () => {
    expect(sanitizeLogoColorResults([{ id: "p1", color: "#aabbcc" }])).toEqual([
      { id: "p1", color: "#AABBCC" },
    ]);
  });

  it("drops malformed colours", () => {
    const results = sanitizeLogoColorResults([
      { id: "p1", color: "red" },
      { id: "p2", color: "#GGG" },
      { id: "p3", color: "#12345" },
      { id: "p4", color: "'; DROP TABLE Project; --" },
    ]);
    expect(results).toEqual([]);
  });

  it("keeps only the first colour sent for a project", () => {
    const results = sanitizeLogoColorResults([
      { id: "p1", color: "#111111" },
      { id: "p1", color: "#222222" },
    ]);
    expect(results).toEqual([{ id: "p1", color: "#111111" }]);
  });
});

describe("buildLogoColorUpdate", () => {
  it("refuses to overwrite a colour that is already set or manual", () => {
    const { text } = buildLogoColorUpdate({ id: "p1", color: "#AABBCC" });
    const sql = text.replace(/\s+/g, " ");

    expect(sql).toContain('"color" IS NULL');
    expect(sql).toContain(`"colorSource" = 'auto'`);
  });

  it("never restamps updatedAt, which orders the dashboard", () => {
    const { text } = buildLogoColorUpdate({ id: "p1", color: "#AABBCC" });
    expect(text).not.toContain("updatedAt");
  });

  it("binds the colour and id as parameters rather than inlining them", () => {
    const { text, values } = buildLogoColorUpdate({ id: "p1", color: "#AABBCC" });

    expect(values).toEqual(["#AABBCC", "p1"]);
    expect(text).not.toContain("#AABBCC");
    expect(text).not.toContain("p1");
  });
});
