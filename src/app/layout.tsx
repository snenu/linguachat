import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, Literata, Noto_Sans_Devanagari } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
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

const description =
  "Learn a language by chatting in real time with native speakers who are learning yours. A kind AI coach corrects your sentences, explains why, and turns new words into flashcards.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LinguaChat: learn a language with native speakers", template: "%s · LinguaChat" },
  description,
  applicationName: "LinguaChat",
  keywords: ["language exchange", "tandem", "language learning", "native speakers", "AI tutor", "chat", "flashcards", "Nexconn"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "LinguaChat",
    title: "LinguaChat: learn a language with native speakers",
    description,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "LinguaChat", description },
  appleWebApp: { capable: true, title: "LinguaChat", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f3f5fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${bricolage.variable} ${literata.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
