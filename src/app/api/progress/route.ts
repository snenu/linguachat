import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, localDay } from "@/lib/day";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { currentStreak, longestStreak } from "@/lib/streak";

/** Practice actions that count toward the daily goal. */
const GOAL_KINDS = ["message_target", "tutor_turn", "review", "voice"] as const;

export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const today = localDay(me.timezone);
  const weekStart = addDays(today, -6);

  const [daily, week, totals, [due]] = await Promise.all([
    db
      .select({ day: schema.activity.day, count: sql<number>`count(*)::int` })
      .from(schema.activity)
      .where(and(eq(schema.activity.userId, me.id), sql`${schema.activity.kind} in ('message_target','tutor_turn','review','voice')`))
      .groupBy(schema.activity.day),
    db
      .select({ day: schema.activity.day, kind: schema.activity.kind, count: sql<number>`count(*)::int` })
      .from(schema.activity)
      .where(and(eq(schema.activity.userId, me.id), gte(schema.activity.day, weekStart), lte(schema.activity.day, today)))
      .groupBy(schema.activity.day, schema.activity.kind),
    db
      .select({ kind: schema.activity.kind, count: sql<number>`count(*)::int` })
      .from(schema.activity)
      .where(eq(schema.activity.userId, me.id))
      .groupBy(schema.activity.kind),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.vocabItems)
      .where(and(eq(schema.vocabItems.userId, me.id), lte(schema.vocabItems.dueAt, new Date()))),
  ]);

  const byDay = new Map(daily.map((d) => [String(d.day), d.count]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekByKind = (kind: string) => week.filter((w) => w.kind === kind).reduce((s, w) => s + w.count, 0);
  const total = (kind: string) => totals.find((t) => t.kind === kind)?.count ?? 0;

  return json({
    today,
    dailyTarget: me.dailyTarget,
    todayCount: byDay.get(today) ?? 0,
    streak: currentStreak(byDay, today, me.dailyTarget),
    longestStreak: longestStreak(byDay, me.dailyTarget),
    dueCards: due?.count ?? 0,
    goalKinds: GOAL_KINDS,
    week: days.map((day) => ({
      day,
      practice: byDay.get(day) ?? 0,
      targetMessages: week.filter((w) => String(w.day) === day && w.kind === "message_target").reduce((s, w) => s + w.count, 0),
    })),
    weekTotals: {
      targetMessages: weekByKind("message_target"),
      correctionsReceived: weekByKind("correction_received"),
      wordsLearned: weekByKind("word_saved"),
      reviews: weekByKind("review"),
      tutorTurns: weekByKind("tutor_turn"),
      voice: weekByKind("voice"),
    },
    allTime: {
      targetMessages: total("message_target"),
      correctionsReceived: total("correction_received"),
      correctionsGiven: total("correction_given"),
      wordsSaved: total("word_saved"),
      reviews: total("review"),
      tutorTurns: total("tutor_turn"),
    },
  });
});
