import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinguaChat",
    short_name: "LinguaChat",
    description: "Learn a language by chatting with native speakers, with a kind AI coach beside every conversation.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5fb",
    theme_color: "#2340c8",
    categories: ["education", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
