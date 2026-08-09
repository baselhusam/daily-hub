"use server";

import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function uploadLogo(formData: FormData): Promise<string | null> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return null;
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPG, WEBP, or SVG.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo must be smaller than 2MB.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = file.type.split("/")[1].replace("svg+xml", "svg");
  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = join(process.cwd(), "public", "uploads");
  const filepath = join(uploadDir, filename);

  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}
