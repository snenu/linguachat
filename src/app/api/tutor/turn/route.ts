import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { correctSentence, streamTutorReply, type Correction } from "@/lib/ai/coach";
import { TUTOR_PERSONAS, type LanguageCode } from "@/lib/languages";
import { setMessageMetadata } from "@/lib/nexconn/server";
import { META, type AiCorrectionMeta } from "@/lib/nexconn/types";
import { ensureTutorBot, logActivity } from "@/lib/server/domain";
import { handler, json, parseBody } from "@/lib/server/http";
import { logMistake } from "@/lib/server/mistakes";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { ownedSession, sessionHistory, streamReplyToNexconn } from "@/lib/server/tutor";
import { tutorTurnSchema } from "@/lib/validation";

export const maxDuration = 60;

/**
 * The learner sent a message to the tutor bot (through the Chat SDK). In parallel:
 * 1. correct it and attach the correction to that Nexconn message as metadata;
 * 2. stream the tutor's in-character reply back into the channel.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, tutorTurnSchema);
  await rateLimit(`tutor-turn:${me.id}`, 200, 3600, "Take a short break; the tutor needs a moment.");
  const session = await ownedSession(me.id, input.sessionId);
  const bot = await ensureTutorBot(session.language);

  const history = await sessionHistory(session.id);
  const lastTutor = [...history].reverse().find((t) => t.role === "tutor")?.text;
  await db.insert(schema.tutorTurns).values({ sessionId: session.id, role: "learner", text: input.text, messageId: input.messageId });
  await logActivity(me, "tutor_turn", session.language, input.messageId);

  const ctx = { targetLanguage: session.language, nativeLanguage: me.nativeLanguages[0] ?? "en", level: session.level };
  const correctionTask = correctSentence(input.text, ctx, lastTutor)
    .then(async (c): Promise<Correction> => {
      if (c.inTargetLanguage) await logActivity(me, "message_target", session.language, input.messageId);
      if (c.inTargetLanguage && !c.ok) {
        const meta: AiCorrectionMeta = { ok: false, corrected: c.corrected, explanation: c.explanation, category: c.category };
        await setMessageMetadata({
          messageId: input.messageId,
          operatorUserId: me.nexconnId,
          channelType: 1,
          channelId: bot.nexconnId,
          metadata: { [META.aiCorrection]: JSON.stringify(meta) },
        }).catch((err) => console.warn("[tutor] metadata failed", err instanceof Error ? err.message : err));
        await logMistake({ userId: me.id, language: session.language, original: input.text, correction: c, source: "tutor", messageId: input.messageId });
      }
      return c;
    })
    .catch(() => null);

  const persona = TUTOR_PERSONAS[session.language as LanguageCode] ?? "Tutor";
  const replyTask = streamReplyToNexconn({
    botId: bot.nexconnId,
    toUserId: me.nexconnId,
    sessionId: session.id,
    source: streamTutorReply({
      language: session.language,
      nativeLanguage: me.nativeLanguages[0] ?? "en",
      level: session.level,
      persona,
      scene: session.brief,
      history: [...history, { role: "learner", text: input.text }],
    }),
  });

  const [correction, reply] = await Promise.all([correctionTask, replyTask]);
  await db.insert(schema.tutorTurns).values({ sessionId: session.id, role: "tutor", text: reply.text, messageId: reply.messageId });
  await db
    .update(schema.tutorSessions)
    .set({ turns: sql`${schema.tutorSessions.turns} + 1`, lastTurnAt: new Date() })
    .where(eq(schema.tutorSessions.id, session.id));
  return json({ correction, reply });
});
