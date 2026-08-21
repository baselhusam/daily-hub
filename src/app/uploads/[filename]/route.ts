import { readFile, stat } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { getUploadsDir } from "@/lib/data-dir";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = join(getUploadsDir(), filename);

  try {
    const fileStat = await stat(filepath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await readFile(filepath);
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";
    const headers: Record<string, string> = {
      "Content-Type": getContentType(filename),
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (extension === "svg") {
      headers["X-Content-Type-Options"] = "nosniff";
      headers["Content-Security-Policy"] =
        "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    }

    return new NextResponse(body, { headers });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
