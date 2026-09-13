import { ImageResponse } from "next/og";
import { BrandIconMark } from "@/lib/brand-icon-mark";

// Manifest icons need stable URLs, which the app/icon.tsx convention does not
// give — its output path carries a build hash. These are served from a fixed
// path instead so manifest.ts can point at them.
const SIZES = [192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: raw } = await params;
  const size = Number(raw);

  if (!SIZES.includes(size as (typeof SIZES)[number])) {
    return new Response("Not found", { status: 404 });
  }

  // Transparent, and close to full-bleed: macOS shows a Dock icon at its own
  // size, so the white tile and padding that suit a 32px favicon read as a white
  // box here. This matches the mark in scripts/macos/icon.svg.
  return new ImageResponse(
    <BrandIconMark size={Math.round(size * 0.96)} background="transparent" />,
    { width: size, height: size },
  );
}
