// Response shapes of our API, shared by client components.

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  nativeLanguages: string[];
  targetLanguage: string | null;
  targetLevel: string | null;
  interests: string[];
  goals: string[];
  nexconnId: string;
  lastActiveAt: string | null;
}

export interface Candidate {
  profile: Profile;
  score: number;
  tandem: boolean;
  reasons: string[];
  sharedInterests: string[];
  relation: "none" | "partner" | "requested" | "incoming";
  requestId: string | null;
}

export interface RequestItem {
  id: string;
  intro: string;
  createdAt: string;
  candidate: Candidate;
}

export interface Progress {
  today: string;
  dailyTarget: number;
  todayCount: number;
  streak: number;
  longestStreak: number;
  dueCards: number;
  week: { day: string; practice: number; targetMessages: number }[];
  weekTotals: {
    targetMessages: number;
    correctionsReceived: number;
    wordsLearned: number;
    reviews: number;
    tutorTurns: number;
    voice: number;
  };
  allTime: {
    targetMessages: number;
    correctionsReceived: number;
    correctionsGiven: number;
    wordsSaved: number;
    reviews: number;
    tutorTurns: number;
  };
}

export interface VocabItem {
  id: string;
  language: string;
  term: string;
  meaning: string;
  partOfSpeech: string;
  reading: string;
  example: string;
  exampleTranslation: string;
  source: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

export interface MistakeItem {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  tag: string;
  source: string;
  createdAt: string;
  correctedByName: string | null;
}

export interface Correction {
  inTargetLanguage: boolean;
  ok: boolean;
  corrected: string;
  explanation: string;
  category: string;
  tag: string;
}

export interface WordInfo {
  term: string;
  reading: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  language: string;
}

export interface RoomSummary {
  id: string;
  language: string;
  band: string;
  bandLabel: string;
  topic: string;
  topicName: string;
  name: string;
  groupId: string | null;
  memberCount: number;
  joined: boolean;
  todayPrompt: string | null;
}

export interface BotInfo {
  nexconnId: string;
  name: string;
  language: string;
}

export interface TutorSession {
  id: string;
  language: string;
  level: string;
  scenario: string;
  title: string;
  turns: number;
  startedAt: string;
  lastTurnAt: string | null;
}
