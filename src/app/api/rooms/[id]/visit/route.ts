import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { parseRoomId } from "@/lib/rooms";
import { handler, HttpError, json } from "@/lib/server/http";
import { ensureDailyPrompt, ensureRoom } from "@/lib/server/rooms";
import { requireOnboardedUser } from "@/lib/server/session";

export const maxDuration = 30;

/** Called when a member opens a room: makes sure today's prompt exists (posted by the room host bot). */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const def = parseRoomId(id);
  if (!def) throw new HttpError(404, "Room not found", "not_found");
  const [row] = await db
    .select({ room: schema.rooms })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .where(and(eq(schema.rooms.id, def.id), eq(schema.roomMembers.userId, me.id)))
    .limit(1);
  if (!row) throw new HttpError(403, "Join the room first", "forbidden");
  // Re-provisions the group (with its members) if it belongs to a previous Nexconn app.
  const room = (await ensureRoom(def)) ?? row.room;
  const prompt = await ensureDailyPrompt(room, def);
  return json({ prompt: prompt?.prompt ? { prompt: prompt.prompt, hint: prompt.hint, day: prompt.day } : null });
});
