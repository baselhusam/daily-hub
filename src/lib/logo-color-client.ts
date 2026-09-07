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

export async function extractAccentFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    if (img.naturalWidth === 0) return null;

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
