import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { LANGUAGE_CODES } from "@/lib/languages";
import { blockedIds, roomHostBot, tutorBot } from "@/lib/server/domain";
import { handler, json, parseBody } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

/** Resolves Nexconn user ids (message senders, room members) to display names and avatars. */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { ids } = await parseBody(req, z.object({ ids: z.array(z.string().regex(/^[a-zA-Z0-9]{1,64}$/)).max(200) }));
  const unique = [...new Set(ids)];
  const [rows, blocked] = await Promise.all([
    unique.length ? db.select().from(schema.users).where(inArray(schema.users.nexconnId, unique)) : [],
    blockedIds(me.id),
  ]);
  const people = rows.map((u) => ({
    nexconnId: u.nexconnId,
    id: u.id,
    name: u.displayName,
    avatarUrl: u.avatarUrl,
    nativeLanguages: u.nativeLanguages,
    targetLanguage: u.targetLanguage,
    blocked: blocked.has(u.id),
    bot: false,
  }));
  const bots = [roomHostBot(), ...LANGUAGE_CODES.map(tutorBot)]
    .filter((b) => unique.includes(b.nexconnId))
    .map((b) => ({
      nexconnId: b.nexconnId,
      id: null,
      name: b.name,
      avatarUrl: null,
      nativeLanguages: b.language ? [b.language] : [],
      targetLanguage: null,
      blocked: false,
      bot: true,
    }));
  return json({ people: [...people, ...bots] });
});
