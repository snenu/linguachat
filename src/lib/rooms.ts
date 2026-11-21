import { LANGUAGES, languageName, type Level } from "./languages";

export const BANDS = [
  { id: "a", label: "A1–A2", name: "Beginner", levels: ["A1", "A2"] as Level[] },
  { id: "b", label: "B1–B2", name: "Intermediate", levels: ["B1", "B2"] as Level[] },
  { id: "c", label: "C1–C2", name: "Advanced", levels: ["C1", "C2"] as Level[] },
] as const;

export const TOPICS = [
  { id: "everyday", name: "Everyday life" },
  { id: "travel", name: "Travel" },
  { id: "work", name: "Work and study" },
  { id: "culture", name: "Films, music and culture" },
] as const;

export interface RoomDef {
  id: string; // e.g. "es-a-travel"
  language: string;
  band: string;
  bandLabel: string;
  topic: string;
  topicName: string;
  name: string;
}

export function roomDef(language: string, band: string, topic: string): RoomDef | null {
  const b = BANDS.find((x) => x.id === band);
  const t = TOPICS.find((x) => x.id === topic);
  if (!b || !t || !LANGUAGES.some((l) => l.code === language)) return null;
  return {
    id: `${language}-${b.id}-${t.id}`,
    language,
    band: b.id,
    bandLabel: b.label,
    topic: t.id,
    topicName: t.name,
    name: `${languageName(language)} ${b.label}: ${t.name}`,
  };
}

export function parseRoomId(id: string): RoomDef | null {
  const [language, band, topic] = id.split("-");
  if (!language || !band || !topic) return null;
  return roomDef(language, band, topic);
}

export function roomsForLanguage(language: string): RoomDef[] {
  return BANDS.flatMap((b) => TOPICS.map((t) => roomDef(language, b.id, t.id)!));
}

export function bandForLevel(level: string | null | undefined): string {
  return BANDS.find((b) => (b.levels as string[]).includes(level ?? ""))?.id ?? "a";
}
