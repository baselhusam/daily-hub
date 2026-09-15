import { ImageResponse } from "next/og";
import { BrandIconMark } from "@/lib/brand-icon-mark";

// Transparent: browsers drop favicons onto their own tiles (tab strips, new-tab
// grids, Safari favourites), and an opaque white square reads as a box there.
// 64px so it stays crisp on retina tiles that show it larger than 16px. The
// mark's viewBox carries its own padding, so it is drawn a little larger than
// the canvas to sit near full-bleed like other favicons.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    // The badge dot pokes above the tile, so the mark's visual centre is a
    // touch below the canvas centre.
    <div style={{ display: "flex", width: "100%", height: "100%", paddingTop: 4 }}>
      <BrandIconMark size={70} background="transparent" />
    </div>,
    { ...size },
  );
}
