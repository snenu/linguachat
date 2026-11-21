import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateRoomPrompt } from "@/lib/ai/coach";
import { createGroup, sendGroup } from "@/lib/nexconn/server";
import { MSG, type RoomPromptContent } from "@/lib/nexconn/types";
import type { RoomDef } from "@/lib/rooms";
import { ensureRoomHostBot } from "./domain";
import { roomGroupId } from "./ids";

/** Creates the room's Nexconn group (owned by the room host bot) the first time anyone joins. */
export async function ensureRoom(def: RoomDef) {
  const [existing] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, def.id)).limit(1);
  if (existing) return existing;
  const host = await ensureRoomHostBot();
  const groupId = roomGroupId(def.id);
  try {
    await createGroup({
      groupId,
      name: def.name,
      ownerId: host.nexconnId,
      introduction: `Practice ${def.topicName.toLowerCase()} conversations with other ${def.bandLabel} learners.`,
    });
  } catch (err) {
    // A concurrent join may have created it already; joining below will confirm it exists.
    console.warn("[rooms] create group", err instanceof Error ? err.message : err);
  }
  const [row] = await db
    .insert(schema.rooms)
    .values({ id: def.id, groupId, language: def.language, band: def.band, topic: def.topic, name: def.name })
    .onConflictDoNothing()
    .returning();
  return row ?? (await db.select().from(schema.rooms).where(eq(schema.rooms.id, def.id)).limit(1))[0];
}

export function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today's conversation prompt. The first visit of the (UTC) day claims the row, generates the
 * prompt with Gemini and the room host bot posts it as an LGC:RoomPrompt custom message.
 */
export async function ensureDailyPrompt(room: typeof schema.rooms.$inferSelect, def: RoomDef) {
  const day = utcDay();
  const [claimed] = await db.insert(schema.roomPrompts).values({ roomId: room.id, day }).onConflictDoNothing().returning();
  if (!claimed) {
    const [row] = await db
      .select()
      .from(schema.roomPrompts)
      .where(and(eq(schema.roomPrompts.roomId, room.id), eq(schema.roomPrompts.day, day)))
      .limit(1);
    // A row older than 60s with no prompt means a previous attempt failed; retry it.
    if (row && !row.prompt && Date.now() - row.createdAt.getTime() > 60_000) {
      await db.delete(schema.roomPrompts).where(and(eq(schema.roomPrompts.roomId, room.id), eq(schema.roomPrompts.day, day)));
      return ensureDailyPrompt(room, def);
    }
    return row?.prompt ? row : null;
  }
  try {
    const { prompt, hint } = await generateRoomPrompt({ language: def.language, band: def.bandLabel, topic: def.topicName, day });
    const host = await ensureRoomHostBot();
    const content: RoomPromptContent = { prompt, hint, day, language: def.language };
    const messageId = await sendGroup({
      fromUserId: host.nexconnId,
      groupId: room.groupId,
      messageType: MSG.roomPrompt,
      content: content as unknown as Record<string, unknown>,
      pushContent: `Today's prompt in ${def.name}`,
    });
    const [row] = await db
      .update(schema.roomPrompts)
      .set({ prompt, hint, messageId })
      .where(and(eq(schema.roomPrompts.roomId, room.id), eq(schema.roomPrompts.day, day)))
      .returning();
    return row;
  } catch (err) {
    await db.delete(schema.roomPrompts).where(and(eq(schema.roomPrompts.roomId, room.id), eq(schema.roomPrompts.day, day)));
    console.warn("[rooms] prompt failed", err instanceof Error ? err.message : err);
    return null;
  }
}
