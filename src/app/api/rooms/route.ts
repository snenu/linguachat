import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { roomsForLanguage } from "@/lib/rooms";
import { handler, json } from "@/lib/server/http";
import { utcDay } from "@/lib/server/rooms";
import { requireOnboardedUser } from "@/lib/server/session";

/** Rooms for the language I'm learning, plus rooms in my native languages where I can help. */
export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const learning = roomsForLanguage(me.targetLanguage);
  const helping = me.nativeLanguages.flatMap(roomsForLanguage);
  const ids = [...learning, ...helping].map((r) => r.id);

  const [created, counts, mine, prompts] = await Promise.all([
    db.select().from(schema.rooms).where(inArray(schema.rooms.id, ids)),
    db
      .select({ roomId: schema.roomMembers.roomId, count: sql<number>`count(*)::int` })
      .from(schema.roomMembers)
      .where(inArray(schema.roomMembers.roomId, ids))
      .groupBy(schema.roomMembers.roomId),
    db.select({ roomId: schema.roomMembers.roomId }).from(schema.roomMembers).where(eq(schema.roomMembers.userId, me.id)),
    db
      .select({ roomId: schema.roomPrompts.roomId, prompt: schema.roomPrompts.prompt })
      .from(schema.roomPrompts)
      .where(and(inArray(schema.roomPrompts.roomId, ids), eq(schema.roomPrompts.day, utcDay()))),
  ]);
  const groupIds = new Map(created.map((r) => [r.id, r.groupId]));
  const countMap = new Map(counts.map((c) => [c.roomId, c.count]));
  const mineSet = new Set(mine.map((m) => m.roomId));
  const promptMap = new Map(prompts.map((p) => [p.roomId, p.prompt]));
  const shape = (r: (typeof learning)[number]) => ({
    ...r,
    groupId: groupIds.get(r.id) ?? null,
    memberCount: countMap.get(r.id) ?? 0,
    joined: mineSet.has(r.id),
    todayPrompt: promptMap.get(r.id) || null,
  });
  return json({ learning: learning.map(shape), helping: helping.map(shape), level: me.targetLevel });
});
