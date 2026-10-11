"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getUploadsDir } from "@/lib/data-dir";
import { prepareUploadedImage } from "@/lib/uploaded-image";

export type UploadLogoResult =
  | { success: true; url: string | null }
  | { success: false; error: string };

/**
 * Returns the error instead of throwing it: a Server Action's thrown message is
 * redacted in production builds, so "Unsupported file type" would reach the
 * user as a generic failure.
 */
export async function uploadLogo(formData: FormData): Promise<UploadLogoResult> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { success: true, url: null };
  }

  try {
    const bytes = await file.arrayBuffer();
    const prepared = prepareUploadedImage(bytes);
    const filename = `${randomUUID()}.${prepared.extension}`;
    const uploadDir = getUploadsDir();
    const filepath = join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filepath, prepared.buffer);
    return { success: true, url: `/uploads/${filename}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save the logo.",
    };
  }
}
