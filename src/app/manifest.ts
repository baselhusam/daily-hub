import type { MetadataRoute } from "next";

// Lets a browser install DailyHub as a web app, which is what gives it its own
// Dock entry and icon on macOS rather than living inside a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DailyHub",
    short_name: "DailyHub",
    description: "A quiet workspace that keeps the day in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
