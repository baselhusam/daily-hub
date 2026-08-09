import { ImageResponse } from "next/og";
import { BrandIconMark } from "@/lib/brand-icon-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <BrandIconMark tileSize={9} gap={3} radius={2.5} cornerRadius={6} />,
    { ...size },
  );
}
