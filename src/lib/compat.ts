import { levelIndex } from "./languages";

export interface MatchProfile {
  nativeLanguages: string[];
  targetLanguage: string | null;
  targetLevel: string | null;
  interests: string[];
  goals: string[];
}

export interface Compatibility {
  score: number; // 0-90 from profile data; the client adds up to 10 for "online now"
  tandem: boolean; // both directions match
  reasons: string[];
  sharedInterests: string[];
}

/**
 * Compatibility between `me` and a candidate.
 * - Exchange (45): candidate is native in my target (30) and learns one of my native languages (15).
 * - Shared interests (25): Jaccard overlap.
 * - Level balance (12): similar levels make a fair exchange (each side gets equal practice).
 * - Shared goals (8).
 */
export function compatibility(me: MatchProfile, them: MatchProfile): Compatibility {
  const reasons: string[] = [];
  const theyTeachMe = !!me.targetLanguage && them.nativeLanguages.includes(me.targetLanguage);
  const iTeachThem = !!them.targetLanguage && me.nativeLanguages.includes(them.targetLanguage);
  let score = 0;
  if (theyTeachMe) score += 30;
  if (iTeachThem) score += 15;
  const tandem = theyTeachMe && iTeachThem;
  if (tandem) reasons.push("Perfect tandem: you can teach each other");
  else if (theyTeachMe) reasons.push("Native speaker of the language you're learning");
  else if (iTeachThem) reasons.push("Learning your native language");

  const mine = new Set(me.interests);
  const shared = them.interests.filter((i) => mine.has(i));
  const union = new Set([...me.interests, ...them.interests]).size;
  if (union > 0) score += Math.round((shared.length / union) * 25);
  if (shared.length > 0) reasons.push(`You both like ${shared.slice(0, 3).join(", ").toLowerCase()}`);

  if (tandem && me.targetLevel && them.targetLevel) {
    const diff = Math.abs(levelIndex(me.targetLevel) - levelIndex(them.targetLevel));
    score += Math.round(12 * (1 - diff / 5));
    if (diff <= 1) reasons.push("Similar levels, so the exchange stays balanced");
  }

  const goalSet = new Set(me.goals);
  const sharedGoals = them.goals.filter((g) => goalSet.has(g));
  if (sharedGoals.length > 0) {
    score += Math.min(8, sharedGoals.length * 4);
    reasons.push(`Same goal: ${sharedGoals[0].toLowerCase()}`);
  }
  return { score: Math.min(90, score), tandem, reasons, sharedInterests: shared };
}

export const ONLINE_BONUS = 10;
