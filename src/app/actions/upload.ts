"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getUploadsDir } from "@/lib/data-dir";
import { prepareUploadedImage } from "@/lib/uploaded-image";

export async function uploadLogo(formData: FormData): Promise<string | null> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return null;
  }

  const bytes = await file.arrayBuffer();
  const prepared = prepareUploadedImage(bytes);
  const filename = `${randomUUID()}.${prepared.extension}`;
  const uploadDir = getUploadsDir();
  const filepath = join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filepath, prepared.buffer);
  return `/uploads/${filename}`;
}
