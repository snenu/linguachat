import { lookupWord } from "@/lib/ai/coach";
import { handler, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { wordSchema } from "@/lib/validation";

/** Meaning, reading and an example for a tapped word, in the learner's native language. */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, wordSchema);
  await rateLimit(`ai:${me.id}`, 240, 3600, "You've used the coach a lot this hour. Try again shortly.");
  const language = input.language ?? me.targetLanguage;
  const info = await lookupWord(input.word, input.sentence, language, me.nativeLanguages[0] ?? "en");
  return json({ ...info, language });
});
