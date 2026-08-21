export type UploadedImageKind = "png" | "jpeg" | "webp" | "svg";

export type UploadedImage = {
  kind: UploadedImageKind;
  extension: "png" | "jpg" | "webp" | "svg";
  buffer: Buffer;
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const SVG_ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "title",
  "desc",
]);

const SVG_ALLOWED_ATTRS = new Set([
  "xmlns",
  "viewbox",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "clip-rule",
  "clip-path",
  "mask",
  "id",
  "class",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "fx",
  "fy",
  "preserveaspectratio",
]);

const SVG_FORBIDDEN_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "image",
  "use",
  "style",
  "link",
  "meta",
]);

const EVENT_HANDLER_PATTERN = /^on/i;
const UNSAFE_URL_PATTERN = /^\s*(javascript|data|vbscript):/i;

function startsWithBytes(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function looksLikeSvg(buffer: Buffer): boolean {
  let start = 0;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    start = 3;
  }

  const text = buffer
    .subarray(start, Math.min(buffer.length, start + 512))
    .toString("utf8")
    .trimStart()
    .toLowerCase();

  return text.startsWith("<svg") || text.startsWith("<?xml");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num: string) =>
      String.fromCodePoint(parseInt(num, 10))
    )
    .replace(/&amp;/gi, "&");
}

function isUnsafeAttributeValue(value: string): boolean {
  const decoded = decodeXmlEntities(value).trim().toLowerCase();
  return UNSAFE_URL_PATTERN.test(decoded) || decoded.includes("javascript:");
}

function parseSvgAttributes(openTag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const attrPattern =
    /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(openTag)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs.set(name, value);
  }

  return attrs;
}

function serializeSvgAttributes(attrs: Map<string, string>): string {
  const parts: string[] = [];
  for (const [name, value] of attrs) {
    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
    parts.push(`${name}="${escaped}"`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function sanitizeSvgMarkup(markup: string): string {
  const lower = markup.toLowerCase();
  for (const tag of SVG_FORBIDDEN_TAGS) {
    if (lower.includes(`<${tag}`) || lower.includes(`</${tag}`)) {
      throw new Error("SVG contains disallowed elements.");
    }
  }

  if (EVENT_HANDLER_PATTERN.test(markup) || lower.includes("javascript:")) {
    throw new Error("SVG contains disallowed scripts or handlers.");
  }

  const tagPattern = /<\/?([a-zA-Z][\w:.-]*)([^>]*)\/?>/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(markup)) !== null) {
    result += markup.slice(lastIndex, match.index);

    const rawName = match[1];
    const tagName = rawName.toLowerCase();
    const isClosing = match[0].startsWith("</");
    const isSelfClosing = /\/>\s*$/.test(match[0]);

    if (!SVG_ALLOWED_TAGS.has(tagName)) {
      throw new Error(`SVG tag <${rawName}> is not allowed.`);
    }

    if (isClosing) {
      result += `</${tagName}>`;
      lastIndex = match.index + match[0].length;
      continue;
    }

    const attrs = parseSvgAttributes(match[2] ?? "");
    const kept = new Map<string, string>();

    for (const [name, value] of attrs) {
      if (EVENT_HANDLER_PATTERN.test(name)) {
        throw new Error("SVG contains disallowed event handlers.");
      }
      if (!SVG_ALLOWED_ATTRS.has(name)) {
        continue;
      }
      if (
        (name === "href" || name === "xlink:href") &&
        isUnsafeAttributeValue(value)
      ) {
        throw new Error("SVG contains an unsafe link target.");
      }
      if (isUnsafeAttributeValue(value)) {
        throw new Error("SVG contains an unsafe attribute value.");
      }
      kept.set(name, value);
    }

    if (!kept.has("xmlns") && tagName === "svg") {
      kept.set("xmlns", "http://www.w3.org/2000/svg");
    }

    result += `<${tagName}${serializeSvgAttributes(kept)}${
      isSelfClosing ? " /" : ""
    }>`;
    lastIndex = match.index + match[0].length;
  }

  result += markup.slice(lastIndex);

  if (!result.trim().toLowerCase().includes("<svg")) {
    throw new Error("SVG must contain a root <svg> element.");
  }

  return result.trim();
}

export function detectUploadedImage(buffer: Buffer): UploadedImage {
  if (buffer.length === 0) {
    throw new Error("File is empty.");
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Logo must be smaller than 2MB.");
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "png", extension: "png", buffer };
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return { kind: "jpeg", extension: "jpg", buffer };
  }

  if (
    buffer.length >= 12 &&
    startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "webp", extension: "webp", buffer };
  }

  if (looksLikeSvg(buffer)) {
    const text = buffer.toString("utf8");
    const sanitized = sanitizeSvgMarkup(text);
    return {
      kind: "svg",
      extension: "svg",
      buffer: Buffer.from(sanitized, "utf8"),
    };
  }

  throw new Error("Unsupported file type. Use PNG, JPG, WEBP, or SVG.");
}

export function prepareUploadedImage(bytes: ArrayBuffer): UploadedImage {
  return detectUploadedImage(Buffer.from(bytes));
}
