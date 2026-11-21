import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BUBBLE_A, BUBBLE_B } from "@/lib/brand";

export const alt = "LinguaChat: learn a language by chatting with native speakers, with an AI coach beside you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const display = readFile(join(process.cwd(), "src/app/_og/bricolage-800.ttf"));
const body = readFile(join(process.cwd(), "src/app/_og/atkinson-400.ttf"));

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 18,
          backgroundImage: "repeating-linear-gradient(-45deg, #E23A4E 0 26px, #ffffff 26px 52px, #2340C8 52px 78px, #ffffff 78px 104px)",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F3F5FB", padding: "56px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="64" height="64" viewBox="0 0 48 48">
              <path d={BUBBLE_A} fill="#2340C8" />
              <path d={BUBBLE_B} fill="#F6B73C" />
            </svg>
            <span style={{ fontFamily: "Bricolage", fontSize: 44, color: "#0F1A3D", letterSpacing: -1.5 }}>LinguaChat</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ fontFamily: "Bricolage", fontSize: 76, lineHeight: 1.02, color: "#0F1A3D", letterSpacing: -3, maxWidth: 900 }}>
              Learn a language from the people who speak it.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, color: "#0F1A3D" }}>
              <span>Yesterday I</span>
              <span style={{ color: "#6A7189", textDecoration: "line-through", textDecorationColor: "#E23A4E" }}>go</span>
              <span style={{ color: "#1B2F9E", background: "#E8ECFB", padding: "2px 12px", borderRadius: 10 }}>went</span>
              <span>to the market.</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#3F4867" }}>
            Real-time tandem chat with native speakers and a kind AI coach, in 12 languages.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: await display, weight: 800, style: "normal" },
        { name: "Atkinson", data: await body, weight: 400, style: "normal" },
      ],
    },
  );
}
