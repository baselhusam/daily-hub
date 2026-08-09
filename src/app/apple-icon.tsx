import { ImageResponse } from "next/og";
import { BrandIconMark } from "@/lib/brand-icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <BrandIconMark tileSize={52} gap={14} radius={12} cornerRadius={32} />,
    { ...size },
  );
}
