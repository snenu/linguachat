import { db, schema } from "@/db";
import { parseRoomId } from "@/lib/rooms";
import { handler, HttpError, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { joinRoom } from "@/lib/server/rooms";
import { requireOnboardedUser } from "@/lib/server/session";

export const maxDuration = 30;

/** Joins a practice room: the server adds the learner to the Nexconn group (no approval needed). */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const def = parseRoomId(id);
  if (!def) throw new HttpError(404, "Room not found", "not_found");
  const allowed = def.language === me.targetLanguage || me.nativeLanguages.includes(def.language);
  if (!allowed) throw new HttpError(403, "Rooms are for the language you learn or your native languages", "forbidden");
  await rateLimit(`room-join:${me.id}`, 30, 3600);

  const room = await joinRoom(def, me.nexconnId);
  if (!room) throw new HttpError(500, "Couldn't open this room. Try again.", "room_failed");
  await db.insert(schema.roomMembers).values({ roomId: room.id, userId: me.id }).onConflictDoNothing();
  return json({ ok: true, groupId: room.groupId });
});
