import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { parseRoomId } from "@/lib/rooms";
import { blockedIds } from "@/lib/server/domain";
import { handler, HttpError, json } from "@/lib/server/http";
import { utcDay } from "@/lib/server/rooms";
import { requireOnboardedUser } from "@/lib/server/session";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const def = parseRoomId(id);
  if (!def) throw new HttpError(404, "Room not found", "not_found");
  const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, def.id)).limit(1);
  if (!room) return json({ room: def, groupId: null, joined: false, members: [], prompt: null });

  const [members, [prompt], blocked] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        nexconnId: schema.users.nexconnId,
        name: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        nativeLanguages: schema.users.nativeLanguages,
        targetLanguage: schema.users.targetLanguage,
        targetLevel: schema.users.targetLevel,
        lastActiveAt: schema.users.lastActiveAt,
        joinedAt: schema.roomMembers.joinedAt,
      })
      .from(schema.roomMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.roomMembers.userId))
      .where(eq(schema.roomMembers.roomId, room.id))
      .orderBy(desc(schema.users.lastActiveAt))
      .limit(300),
    db
      .select()
      .from(schema.roomPrompts)
      .where(and(eq(schema.roomPrompts.roomId, room.id), eq(schema.roomPrompts.day, utcDay())))
      .limit(1),
    blockedIds(me.id),
  ]);
  return json({
    room: def,
    groupId: room.groupId,
    joined: members.some((m) => m.id === me.id),
    members: members.map((m) => ({ ...m, blocked: blocked.has(m.id) })),
    prompt: prompt?.prompt ? { prompt: prompt.prompt, hint: prompt.hint, day: prompt.day } : null,
  });
});
