import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { quitGroup } from "@/lib/nexconn/server";
import { parseRoomId } from "@/lib/rooms";
import { handler, HttpError, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";

export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const def = parseRoomId(id);
  if (!def) throw new HttpError(404, "Room not found", "not_found");
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, def.id)).limit(1);
  if (!room) return json({ ok: true });
  await quitGroup(room.groupId, [me.nexconnId]).catch((err) => console.warn("[rooms] leave", err instanceof Error ? err.message : err));
  await db.delete(schema.roomMembers).where(and(eq(schema.roomMembers.roomId, room.id), eq(schema.roomMembers.userId, me.id)));
  return json({ ok: true });
});
