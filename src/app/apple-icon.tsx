import { ImageResponse } from "next/og";
import { BrandIconMark } from "@/lib/brand-icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <BrandIconMark size={112} />,
    { ...size },
  );
}
