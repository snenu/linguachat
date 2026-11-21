import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { tutorBot } from "@/lib/server/domain";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";

export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const sessions = await db
    .select()
    .from(schema.tutorSessions)
    .where(eq(schema.tutorSessions.userId, me.id))
    .orderBy(desc(schema.tutorSessions.startedAt))
    .limit(20);
  return json({
    bot: tutorBot(me.targetLanguage),
    sessions: sessions.filter((s) => s.language === me.targetLanguage),
  });
});
