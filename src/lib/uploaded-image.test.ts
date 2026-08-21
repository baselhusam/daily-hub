import { describe, expect, it } from "vitest";
import { detectUploadedImage } from "@/lib/uploaded-image";

const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

const WEBP_HEADER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("uploaded-image", () => {
  it("detects PNG from magic bytes", () => {
    const result = detectUploadedImage(PNG_HEADER);
    expect(result.kind).toBe("png");
    expect(result.extension).toBe("png");
  });

  it("detects JPEG from magic bytes", () => {
    const result = detectUploadedImage(JPEG_HEADER);
    expect(result.kind).toBe("jpeg");
    expect(result.extension).toBe("jpg");
  });

  it("detects WEBP from magic bytes", () => {
    const result = detectUploadedImage(WEBP_HEADER);
    expect(result.kind).toBe("webp");
    expect(result.extension).toBe("webp");
  });

  it("sanitizes a simple SVG", () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3" fill="#2383E2"/></svg>',
      "utf8"
    );
    const result = detectUploadedImage(svg);
    expect(result.kind).toBe("svg");
    expect(result.buffer.toString("utf8")).toContain("<circle");
  });

  it("rejects SVG with script tags", () => {
    const svg = Buffer.from(
      '<svg><script>alert(1)</script><rect width="10" height="10"/></svg>',
      "utf8"
    );
    expect(() => detectUploadedImage(svg)).toThrow(/disallowed/i);
  });

  it("rejects SVG with event handlers", () => {
    const svg = Buffer.from(
      '<svg><rect width="10" height="10" onload="alert(1)"/></svg>',
      "utf8"
    );
    expect(() => detectUploadedImage(svg)).toThrow(/handler/i);
  });

  it("rejects SVG with foreignObject", () => {
    const svg = Buffer.from(
      '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject></svg>',
      "utf8"
    );
    expect(() => detectUploadedImage(svg)).toThrow(/disallowed/i);
  });

  it("rejects unknown file types", () => {
    expect(() => detectUploadedImage(Buffer.from("not-an-image", "utf8"))).toThrow(
      /unsupported/i
    );
  });
});
