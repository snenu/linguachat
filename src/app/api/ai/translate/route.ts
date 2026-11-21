import { translateText } from "@/lib/ai/coach";
import { handler, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { translateSchema } from "@/lib/validation";

/** Translates a message into the learner's (first) native language with Gemini. */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, translateSchema);
  await rateLimit(`ai:${me.id}`, 240, 3600, "You've used the coach a lot this hour. Try again shortly.");
  const to = me.nativeLanguages[0] ?? "en";
  const result = await translateText(input.text, to);
  return json({ ...result, to });
});
