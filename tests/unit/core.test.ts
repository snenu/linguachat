import { describe, expect, it } from "vitest";
import { sm2, nextDue } from "@/lib/sm2";
import { compatibility } from "@/lib/compat";
import { currentStreak, longestStreak } from "@/lib/streak";
import { suggestLevel } from "@/lib/languages";
import { parseRoomId, roomsForLanguage, bandForLevel } from "@/lib/rooms";
import { localDay, addDays } from "@/lib/day";

describe("sm2", () => {
  const fresh = { ease: 2.5, intervalDays: 0, repetitions: 0 };
  it("schedules 1 day, then 6 days, then interval * ease on good answers", () => {
    const a = sm2(fresh, 4);
    expect(a).toEqual({ ease: 2.5, intervalDays: 1, repetitions: 1 });
    const b = sm2(a, 4);
    expect(b.intervalDays).toBe(6);
    const c = sm2(b, 4);
    expect(c.intervalDays).toBe(15);
  });
  it("resets repetitions on a failed recall and never drops ease below 1.3", () => {
    let s = sm2(sm2(fresh, 5), 5);
    s = sm2(s, 1);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
    let low = fresh;
    for (let i = 0; i < 20; i++) low = sm2(low, 0);
    expect(low.ease).toBe(1.3);
  });
  it("easy answers raise ease", () => {
    expect(sm2(fresh, 5).ease).toBeCloseTo(2.6);
  });
  it("failed cards come back in 10 minutes", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(nextDue(1, 1, now).getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(nextDue(4, 6, now).toISOString()).toBe("2026-01-07T00:00:00.000Z");
  });
});

describe("compatibility", () => {
  const hindiSpeaker = {
    nativeLanguages: ["hi"],
    targetLanguage: "en",
    targetLevel: "B1",
    interests: ["Music", "Travel"],
    goals: ["Career and work"],
  };
  const englishSpeaker = {
    nativeLanguages: ["en"],
    targetLanguage: "hi",
    targetLevel: "A2",
    interests: ["Travel", "Books"],
    goals: ["Career and work"],
  };
  it("rewards a reciprocal tandem match", () => {
    const c = compatibility(hindiSpeaker, englishSpeaker);
    expect(c.tandem).toBe(true);
    expect(c.score).toBeGreaterThan(55);
    expect(c.sharedInterests).toEqual(["Travel"]);
    expect(c.reasons[0]).toMatch(/tandem/i);
  });
  it("scores one-way matches lower than tandem", () => {
    const frenchLearner = { ...englishSpeaker, targetLanguage: "fr" };
    const oneWay = compatibility(hindiSpeaker, frenchLearner);
    expect(oneWay.tandem).toBe(false);
    expect(oneWay.score).toBeLessThan(compatibility(hindiSpeaker, englishSpeaker).score);
  });
  it("is capped at 90 (online bonus is added client-side)", () => {
    const a = { nativeLanguages: ["en"], targetLanguage: "es", targetLevel: "B1", interests: ["Music"], goals: ["Travel", "Study"] };
    const b = { nativeLanguages: ["es"], targetLanguage: "en", targetLevel: "B1", interests: ["Music"], goals: ["Travel", "Study"] };
    expect(compatibility(a, b).score).toBe(90);
  });
});

describe("streaks", () => {
  const m = new Map([
    ["2026-03-01", 20],
    ["2026-03-02", 25],
    ["2026-03-03", 5],
    ["2026-03-04", 20],
    ["2026-03-05", 30],
  ]);
  it("counts consecutive goal days without breaking on an unfinished today", () => {
    expect(currentStreak(m, "2026-03-05", 20)).toBe(2);
    expect(currentStreak(m, "2026-03-06", 20)).toBe(2);
    expect(currentStreak(m, "2026-03-07", 20)).toBe(0);
  });
  it("finds the longest run", () => {
    expect(longestStreak(m, 20)).toBe(2);
    expect(longestStreak(m, 5)).toBe(5);
  });
});

describe("helpers", () => {
  it("suggests the highest consecutive agreed CEFR level", () => {
    expect(suggestLevel([true, true, true, false, true, false])).toBe("B1");
    expect(suggestLevel([false, true])).toBe("A1");
  });
  it("parses room ids and lists 12 rooms per language", () => {
    expect(parseRoomId("es-a-travel")?.name).toBe("Spanish A1–A2: Travel");
    expect(parseRoomId("xx-a-travel")).toBeNull();
    expect(roomsForLanguage("hi")).toHaveLength(12);
    expect(bandForLevel("B2")).toBe("b");
  });
  it("computes local days across timezones", () => {
    const at = new Date("2026-03-01T20:00:00Z");
    expect(localDay("Asia/Kolkata", at)).toBe("2026-03-02");
    expect(localDay("America/New_York", at)).toBe("2026-03-01");
    expect(localDay("Not/AZone", at)).toBe("2026-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});
