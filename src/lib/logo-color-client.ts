"use client";

import { pickLogoAccentColor } from "@/lib/logo-color";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads an already-stored logo (`/uploads/…`) back as a data URL. Same-origin
 * only — remote logos go through `fetchLogoDataUrl` instead, since a canvas
 * cannot read a cross-origin image.
 */
export async function readSameOriginUrlAsDataUrl(url: string): Promise<string | null> {
  if (!url.startsWith("/")) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await readFileAsDataUrl(new File([blob], "logo", { type: blob.type }));
  } catch {
    return null;
  }
}

const IMAGE_LOAD_TIMEOUT_MS = 10_000;

/**
 * `img.decode()` looks like the right call here, but it never settles while a
 * page is hidden — Chromium defers decoding for anything it cannot paint — so
 * a tab left in the background would hang the one-time colour backfill
 * forever. The `load` event fires either way, and `drawImage` decodes on
 * demand. The timeout keeps one pathological image from stalling a pass.
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();

    const timer = window.setTimeout(() => resolve(null), IMAGE_LOAD_TIMEOUT_MS);
    const settle = (value: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };

    img.onload = () => settle(img);
    img.onerror = () => settle(null);
    img.src = dataUrl;
  });
}

export async function extractAccentFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    if (!img || img.naturalWidth === 0) return null;

    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    return pickLogoAccentColor(data);
  } catch {
    // A failed extraction must never block saving a project.
    return null;
  }
}
