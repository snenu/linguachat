import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { streamTutorReply } from "@/lib/ai/coach";
import { TUTOR_PERSONAS, TUTOR_SCENARIOS, type LanguageCode } from "@/lib/languages";
import { sendDirect } from "@/lib/nexconn/server";
import { MSG, type TutorTipContent } from "@/lib/nexconn/types";
import { ensureTutorBot } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { LEARNER_SCENES, streamReplyToNexconn } from "@/lib/server/tutor";
import { tutorSessionSchema } from "@/lib/validation";

export const maxDuration = 60;

/**
 * Starts a tutor role-play: posts a scene card (custom message) from the tutor bot, then streams
 * the tutor's opening line into the learner's direct channel with the bot.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, tutorSessionSchema);
  await rateLimit(`tutor-session:${me.id}`, 30, 3600, "You've started many sessions this hour. Continue one of them.");
  const def = TUTOR_SCENARIOS.find((s) => s.id === input.scenario)!;
  if (input.scenario === "custom" && !input.custom?.trim()) {
    throw new HttpError(400, "Describe the scenario you want to practise", "invalid_input");
  }
  const brief =
    input.scenario === "custom"
      ? `The learner asked to practise this situation: "${input.custom!.trim()}". Play the other person in it.`
      : def.brief;
  const learnerScene = input.scenario === "custom" ? input.custom!.trim() : LEARNER_SCENES[input.scenario];
  const title = input.scenario === "custom" ? "Your own scenario" : def.title;

  const bot = await ensureTutorBot(me.targetLanguage);
  const [session] = await db
    .insert(schema.tutorSessions)
    .values({ userId: me.id, language: me.targetLanguage, level: me.targetLevel, scenario: input.scenario, title, brief })
    .returning();

  const card: TutorTipContent = { kind: "scene", title, items: [learnerScene, `Level ${me.targetLevel}`], sessionId: session.id };
  await sendDirect({
    fromUserId: bot.nexconnId,
    toUserIds: [me.nexconnId],
    messageType: MSG.tutorTip,
    content: card as unknown as Record<string, unknown>,
    pushContent: `New practice: ${title}`,
  });

  const persona = TUTOR_PERSONAS[me.targetLanguage as LanguageCode] ?? "Tutor";
  try {
    const reply = await streamReplyToNexconn({
      botId: bot.nexconnId,
      toUserId: me.nexconnId,
      sessionId: session.id,
      source: streamTutorReply({
        language: me.targetLanguage,
        nativeLanguage: me.nativeLanguages[0] ?? "en",
        level: me.targetLevel,
        persona,
        scene: brief,
        history: [],
        opening: true,
      }),
    });
    await db.insert(schema.tutorTurns).values({ sessionId: session.id, role: "tutor", text: reply.text, messageId: reply.messageId });
    await db.update(schema.tutorSessions).set({ lastTurnAt: new Date() }).where(eq(schema.tutorSessions.id, session.id));
  } catch (err) {
    // The scene card is posted; the learner can still start the conversation themselves.
    console.warn("[tutor] opening failed", err instanceof Error ? err.message : err);
  }
  return json({ session, bot }, { status: 201 });
});
