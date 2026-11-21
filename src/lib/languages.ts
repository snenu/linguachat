// Shared language, level, interest and goal catalogs (client + server safe).

export const LANGUAGES = [
  { code: "en", name: "English", native: "English", voice: "en-US", rtl: false },
  { code: "hi", name: "Hindi", native: "हिन्दी", voice: "hi-IN", rtl: false },
  { code: "es", name: "Spanish", native: "Español", voice: "es-ES", rtl: false },
  { code: "fr", name: "French", native: "Français", voice: "fr-FR", rtl: false },
  { code: "de", name: "German", native: "Deutsch", voice: "de-DE", rtl: false },
  { code: "pt", name: "Portuguese", native: "Português", voice: "pt-BR", rtl: false },
  { code: "it", name: "Italian", native: "Italiano", voice: "it-IT", rtl: false },
  { code: "ru", name: "Russian", native: "Русский", voice: "ru-RU", rtl: false },
  { code: "ja", name: "Japanese", native: "日本語", voice: "ja-JP", rtl: false },
  { code: "ko", name: "Korean", native: "한국어", voice: "ko-KR", rtl: false },
  { code: "zh", name: "Mandarin Chinese", native: "中文", voice: "zh-CN", rtl: false },
  { code: "ar", name: "Arabic", native: "العربية", voice: "ar-SA", rtl: true },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function language(code: string | null | undefined) {
  return LANGUAGES.find((l) => l.code === code);
}

export function languageName(code: string | null | undefined): string {
  return language(code)?.name ?? "Unknown";
}

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export function levelIndex(level: string | null | undefined): number {
  const i = LEVELS.indexOf((level ?? "") as Level);
  return i < 0 ? 0 : i;
}

/**
 * CEFR self-check: "can-do" statements, one per level, adapted from the CEFR global scale.
 * The suggested level is the highest level where the learner agrees with that statement and
 * every statement below it.
 */
export const SELF_CHECK: { level: Level; statement: string }[] = [
  { level: "A1", statement: "I can introduce myself and ask simple questions like where someone lives." },
  { level: "A2", statement: "I can talk about my family, work and daily routine in simple sentences." },
  { level: "B1", statement: "I can handle most travel situations and describe experiences and plans." },
  { level: "B2", statement: "I can follow a lively conversation and explain my point of view on a topic." },
  { level: "C1", statement: "I can express ideas fluently without searching for words, even on complex topics." },
  { level: "C2", statement: "I can understand nearly everything I hear and express fine shades of meaning." },
];

export function suggestLevel(agreed: boolean[]): Level {
  let level: Level = "A1";
  for (let i = 0; i < SELF_CHECK.length; i++) {
    if (!agreed[i]) break;
    level = SELF_CHECK[i].level;
  }
  return level;
}

export const INTERESTS = [
  "Travel",
  "Food and cooking",
  "Music",
  "Movies and TV",
  "Books",
  "Sports",
  "Technology",
  "Business",
  "Science",
  "Art and design",
  "Gaming",
  "Nature",
  "History",
  "Fashion",
  "Photography",
  "Culture",
] as const;

export const GOALS = [
  "Everyday conversation",
  "Travel",
  "Career and work",
  "Exams",
  "Family and heritage",
  "Moving abroad",
  "Films, music and books",
  "Study",
] as const;

export const DAILY_TARGETS = [
  { value: 10, label: "Casual", hint: "About 10 minutes" },
  { value: 20, label: "Regular", hint: "About 20 minutes" },
  { value: 40, label: "Serious", hint: "About 40 minutes" },
  { value: 60, label: "Intense", hint: "An hour or more" },
] as const;

export const MISTAKE_CATEGORIES = ["grammar", "vocabulary", "spelling", "word_order", "other"] as const;
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

export const MISTAKE_LABELS: Record<MistakeCategory, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  spelling: "Spelling",
  word_order: "Word order",
  other: "Other",
};

export const TUTOR_SCENARIOS = [
  { id: "cafe", title: "Ordering at a café", brief: "You are a friendly barista at a busy café. The learner is a customer ordering drinks and snacks." },
  { id: "interview", title: "Job interview", brief: "You are a hiring manager interviewing the learner for a job they want. Ask typical interview questions." },
  { id: "travel", title: "Travel and directions", brief: "You are a helpful local. The learner is a traveller asking for directions, tickets and recommendations." },
  { id: "doctor", title: "Doctor's visit", brief: "You are a calm family doctor. The learner is a patient describing how they feel." },
  { id: "smalltalk", title: "Small talk", brief: "You are a friendly new acquaintance at a party. Chat casually about hobbies, weekends and life." },
  { id: "custom", title: "Your own scenario", brief: "" },
] as const;

export type TutorScenarioId = (typeof TUTOR_SCENARIOS)[number]["id"];

/** A tutor persona per language. Personas are fictional characters, clearly labelled as AI. */
export const TUTOR_PERSONAS: Record<LanguageCode, string> = {
  en: "Emma",
  hi: "Aarav",
  es: "Lucía",
  fr: "Camille",
  de: "Jonas",
  pt: "Beatriz",
  it: "Giulia",
  ru: "Sasha",
  ja: "Haruto",
  ko: "Jiwoo",
  zh: "Mei",
  ar: "Layla",
};
