import { z } from "zod";
import { GOALS, INTERESTS, LANGUAGE_CODES, LEVELS, MISTAKE_CATEGORIES } from "./languages";

const text = (max: number) => z.string().trim().max(max);

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(40, "Keep it under 40 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  ageConfirmed: z.literal(true, { message: "You must be 16 or older to use LinguaChat" }),
  timezone: z.string().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const languageCode = z.enum(LANGUAGE_CODES);
export const level = z.enum(LEVELS);

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    bio: text(300),
    nativeLanguages: z.array(languageCode).min(1, "Pick at least one native language").max(3),
    targetLanguage: languageCode,
    targetLevel: level,
    interests: z.array(z.enum(INTERESTS)).max(10),
    goals: z.array(z.enum(GOALS)).max(5),
    dailyTarget: z.number().int().min(5).max(120),
    timezone: z.string().max(64),
    autoCorrect: z.boolean(),
  })
  .partial()
  .refine((p) => !(p.targetLanguage && p.nativeLanguages?.includes(p.targetLanguage)), {
    message: "Pick a language you are learning that isn't one of your native languages",
    path: ["targetLanguage"],
  });

export const requestSchema = z.object({
  toUserId: z.string().uuid(),
  intro: text(300).default(""),
});

export const requestActionSchema = z.object({ action: z.enum(["accept", "decline", "cancel"]) });

export const reportSchema = z.object({
  userId: z.string().uuid(),
  reason: z.enum(["spam", "harassment", "inappropriate", "underage", "other"]),
  details: text(1000).default(""),
  alsoBlock: z.boolean().default(true),
});

export const channelRef = z.object({
  channelType: z.enum(["direct", "group"]),
  channelId: z.string().regex(/^[a-zA-Z0-9]{1,64}$/),
});

export const checkSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  previous: text(400).optional(),
});

export const annotateSchema = channelRef.extend({
  messageId: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(1500),
  previous: text(400).optional(),
});

export const translateSchema = z.object({ text: z.string().trim().min(1).max(2000) });

export const wordSchema = z.object({
  word: z.string().trim().min(1).max(80),
  sentence: text(500).default(""),
  language: languageCode.optional(),
});

export const voiceSchema = channelRef.extend({
  messageId: z.string().min(1).max(64),
  remoteUrl: z.string().url().max(2000),
  own: z.boolean(),
});

export const correctionSchema = z.object({
  partnerUserId: z.string().uuid(),
  original: z.string().trim().min(1).max(1000),
  corrected: z.string().trim().min(1).max(1000),
  note: text(300).default(""),
  messageId: z.string().max(64).optional(),
  category: z.enum(MISTAKE_CATEGORIES).default("other"),
});

export const vocabCreateSchema = z.object({
  term: z.string().trim().min(1).max(80),
  meaning: z.string().trim().min(1).max(300),
  language: languageCode,
  partOfSpeech: text(40).default(""),
  reading: text(120).default(""),
  example: text(400).default(""),
  exampleTranslation: text(400).default(""),
  source: z.enum(["chat", "tutor", "room", "manual"]).default("manual"),
});

export const vocabUpdateSchema = vocabCreateSchema.pick({ meaning: true, example: true, exampleTranslation: true, reading: true }).partial();

export const reviewSchema = z.object({ grade: z.number().int().min(0).max(5) });

export const tutorSessionSchema = z.object({
  scenario: z.enum(["cafe", "interview", "travel", "doctor", "smalltalk", "custom"]),
  custom: text(300).optional(),
});

export const tutorTurnSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
  messageId: z.string().min(1).max(64),
});

export const tutorHintSchema = z.object({ sessionId: z.string().uuid() });
