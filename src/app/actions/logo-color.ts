"use server";

import {
  buildLogoColorUpdate,
  sanitizeLogoColorResults,
  type LogoColorResult,
} from "@/lib/logo-color-backfill";
import { prisma } from "@/lib/prisma";
import { revalidateApp } from "@/lib/revalidate";
import { detectUploadedImage, type UploadedImageKind } from "@/lib/uploaded-image";

const MAX_REMOTE_LOGO_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const MIME_BY_KIND: Record<UploadedImageKind, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Fetches a remote logo server-side and hands it back as a `data:` URL — a
 * `<canvas>` cannot read pixels from a cross-origin image without CORS
 * headers, so this is a same-origin proxy for the browser extraction step.
 */
export async function fetchLogoDataUrl(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  try {
    const response = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok || !response.body) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_REMOTE_LOGO_BYTES) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_REMOTE_LOGO_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const prepared = detectUploadedImage(buffer);
    const mime = MIME_BY_KIND[prepared.kind];

    return `data:${mime};base64,${prepared.buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Stores the colours the browser extracted for projects that had none, and
 * closes the one-time backfill.
 *
 * The stamp is written even when nothing could be extracted — a logo that
 * yields no usable colour must not be re-fetched and re-decoded on every page
 * load for the rest of the install's life.
 */
export async function completeLogoColorBackfill(
  results: LogoColorResult[]
): Promise<void> {
  const colors = sanitizeLogoColorResults(results);

  if (colors.length > 0) {
    await prisma.$transaction(
      colors.map((result) => prisma.$executeRaw(buildLogoColorUpdate(result)))
    );
  }

  await prisma.settings.upsert({
    where: { id: "default" },
    update: { logoColorsBackfilledAt: new Date() },
    create: { id: "default", logoColorsBackfilledAt: new Date() },
  });

  revalidateApp();
}
