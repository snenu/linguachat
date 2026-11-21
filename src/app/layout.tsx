import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Literata, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext", "cyrillic"],
  style: ["normal", "italic"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LinguaChat", template: "%s · LinguaChat" },
  description: "Learn a language by chatting with native speakers, with a kind AI coach beside every conversation.",
  applicationName: "LinguaChat",
};

export const viewport: Viewport = {
  themeColor: "#f7f6f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${atkinson.variable} ${literata.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
