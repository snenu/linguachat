"use client";

import { language } from "@/lib/languages";

/** Speaks text with the browser's SpeechSynthesis in the right language, if a voice exists. */
export function speak(text: string, langCode: string | null | undefined): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const tag = language(langCode)?.voice ?? "en-US";
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = tag;
  const voices = synth.getVoices();
  const voice = voices.find((v) => v.lang === tag) ?? voices.find((v) => v.lang.startsWith(tag.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = 0.92;
  synth.speak(u);
  return true;
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const SCRIPTS: [RegExp, string[]][] = [
  [/\p{Script=Devanagari}/u, ["hi"]],
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, ["ja"]],
  [/\p{Script=Hangul}/u, ["ko"]],
  [/\p{Script=Han}/u, ["zh", "ja"]],
  [/\p{Script=Arabic}/u, ["ar"]],
  [/\p{Script=Cyrillic}/u, ["ru"]],
];
const LATIN = ["en", "es", "fr", "de", "pt", "it"];

/**
 * Best guess of which of the learner's languages a message is written in, from its script.
 * Latin text defaults to whichever Latin-script language the learner uses (target first).
 */
export function guessLang(text: string, candidates: (string | null | undefined)[]): string | null {
  const langs = candidates.filter((c): c is string => !!c);
  for (const [re, codes] of SCRIPTS) {
    if (re.test(text)) return langs.find((l) => codes.includes(l)) ?? codes[0];
  }
  return langs.find((l) => LATIN.includes(l)) ?? langs[0] ?? null;
}

/** Splits text into word-like segments (handles CJK via Intl.Segmenter when available). */
export function segmentWords(text: string, langCode?: string | null): { text: string; word: boolean }[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const seg = new Seg(langCode ?? undefined, { granularity: "word" });
    return [...seg.segment(text)].map((s) => ({ text: s.segment, word: !!s.isWordLike }));
  }
  return text.split(/(\s+|[.,!?;:"()])/).filter(Boolean).map((t) => ({ text: t, word: /\p{L}/u.test(t) }));
}
