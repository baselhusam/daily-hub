import { describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

import { uploadLogo } from "@/app/actions/upload";

function formWith(file: File) {
  const formData = new FormData();
  formData.set("logo", file);
  return formData;
}

describe("uploadLogo", () => {
  it("returns the validation message instead of throwing", async () => {
    const result = await uploadLogo(
      formWith(new File(["not an image"], "notes.txt", { type: "text/plain" }))
    );

    expect(result).toEqual({
      success: false,
      error: "Unsupported file type. Use PNG, JPG, WEBP, or SVG.",
    });
  });

  it("treats a missing file as no logo", async () => {
    expect(await uploadLogo(new FormData())).toEqual({ success: true, url: null });
  });
});
