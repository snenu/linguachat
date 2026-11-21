import { tutorHints } from "@/lib/ai/coach";
import { sendDirect } from "@/lib/nexconn/server";
import { MSG, type TutorTipContent } from "@/lib/nexconn/types";
import { ensureTutorBot } from "@/lib/server/domain";
import { handler, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { ownedSession, sessionHistory } from "@/lib/server/tutor";
import { tutorHintSchema } from "@/lib/validation";

/** "Help me reply": the tutor bot posts a tip card with three things the learner could say. */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, tutorHintSchema);
  await rateLimit(`ai:${me.id}`, 240, 3600, "You've used the coach a lot this hour. Try again shortly.");
  const session = await ownedSession(me.id, input.sessionId);
  const bot = await ensureTutorBot(session.language);
  const items = await tutorHints({
    language: session.language,
    nativeLanguage: me.nativeLanguages[0] ?? "en",
    level: session.level,
    scene: session.brief,
    history: await sessionHistory(session.id),
  });
  const card: TutorTipContent = { kind: "hints", title: "Things you could say", items, sessionId: session.id };
  await sendDirect({
    fromUserId: bot.nexconnId,
    toUserIds: [me.nexconnId],
    messageType: MSG.tutorTip,
    content: card as unknown as Record<string, unknown>,
  });
  return json({ items });
});
