import { correctSentence } from "@/lib/ai/coach";
import { handler, json, parseBody } from "@/lib/server/http";
import { logMistake } from "@/lib/server/mistakes";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { checkSchema } from "@/lib/validation";

/** "Check before sending": returns the corrected version and a one-line explanation. */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, checkSchema);
  await rateLimit(`ai:${me.id}`, 240, 3600, "You've used the coach a lot this hour. Try again shortly.");
  const ctx = { targetLanguage: me.targetLanguage, nativeLanguage: me.nativeLanguages[0] ?? "en", level: me.targetLevel };
  const correction = await correctSentence(input.text, ctx, input.previous);
  if (correction.inTargetLanguage && !correction.ok) {
    await logMistake({ userId: me.id, language: me.targetLanguage, original: input.text, correction, source: "check" });
  }
  return json(correction);
});
