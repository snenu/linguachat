import { correctSentence } from "@/lib/ai/coach";
import { setMessageMetadata } from "@/lib/nexconn/server";
import { META, type AiCorrectionMeta } from "@/lib/nexconn/types";
import { assertDirectAccess, assertRoomMember, logActivity } from "@/lib/server/domain";
import { handler, json, parseBody } from "@/lib/server/http";
import { logMistake } from "@/lib/server/mistakes";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { annotateSchema } from "@/lib/validation";

/**
 * Called by the sender's client right after a text message is delivered. Counts practice,
 * and when the message is in the target language and has a mistake, attaches the correction to
 * the Nexconn message as metadata (both people see it) and saves it to the mistake log.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, annotateSchema);
  if (input.channelType === "direct") await assertDirectAccess(me, input.channelId);
  else await assertRoomMember(me, input.channelId);
  await rateLimit(`annotate:${me.id}`, 300, 3600, "Slow down a little so the coach can keep up.");

  const ctx = { targetLanguage: me.targetLanguage, nativeLanguage: me.nativeLanguages[0] ?? "en", level: me.targetLevel };
  const correction = await correctSentence(input.text, ctx, input.previous);
  await logActivity(me, correction.inTargetLanguage ? "message_target" : "message_other", me.targetLanguage, input.messageId);

  let attached = false;
  if (me.autoCorrect && correction.inTargetLanguage && !correction.ok) {
    const meta: AiCorrectionMeta = {
      ok: false,
      corrected: correction.corrected.slice(0, 1500),
      explanation: correction.explanation.slice(0, 400),
      category: correction.category,
    };
    try {
      await setMessageMetadata({
        messageId: input.messageId,
        operatorUserId: me.nexconnId,
        channelType: input.channelType === "direct" ? 1 : 3,
        channelId: input.channelId,
        metadata: { [META.aiCorrection]: JSON.stringify(meta) },
      });
      attached = true;
    } catch (err) {
      console.warn("[annotate] metadata failed", err instanceof Error ? err.message : err);
    }
    await logMistake({
      userId: me.id,
      language: me.targetLanguage,
      original: input.text,
      correction,
      source: "auto",
      messageId: input.messageId,
    });
  }
  return json({ ...correction, attached, autoCorrect: me.autoCorrect });
});
