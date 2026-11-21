// Custom Nexconn message types and metadata keys shared by client and server.
// Custom types must not start with RC:/NC: and must be <= 32 chars.

export const MSG = {
  text: "RC:TxtMsg",
  reference: "RC:ReferenceMsg",
  hdVoice: "RC:HQVCMsg",
  stream: "RC:StreamMsg",
  correction: "LGC:Correction",
  vocabCard: "LGC:VocabCard",
  tutorTip: "LGC:TutorTip",
  roomPrompt: "LGC:RoomPrompt",
  notice: "LGC:Notice",
  signal: "LGC:Signal",
} as const;

/** Partner's manual correction card. */
export interface CorrectionCardContent {
  original: string;
  corrected: string;
  note: string;
  language: string;
  targetMessageId?: string;
}

/** A word shared as a card (meaning + example). */
export interface VocabCardContent {
  term: string;
  meaning: string;
  example: string;
  reading: string;
  language: string;
}

/** Tutor bot tips: scene openers, inline hints, useful phrases. */
export interface TutorTipContent {
  kind: "scene" | "hints";
  title: string;
  items: string[];
  sessionId?: string;
}

export interface RoomPromptContent {
  prompt: string;
  hint: string;
  day: string;
  language: string;
}

export interface NoticeContent {
  kind: "accepted";
  text: string;
}

/** Transient status message (not stored, not counted) used to nudge clients to refresh. */
export interface SignalContent {
  kind: "requests_changed" | "partners_changed" | "stream";
  messageId?: string;
}

/** Metadata keys attached to messages (Nexconn message expansion). */
export const META = {
  aiCorrection: "aic",
  voice: "vtx",
} as const;

export interface AiCorrectionMeta {
  ok: boolean; // true when the sentence was already correct
  corrected: string;
  explanation: string;
  category: string;
}

export interface VoiceMeta {
  transcript: string;
  corrected?: string;
  explanation?: string;
  category?: string;
}
