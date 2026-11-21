import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { findPatterns } from "@/lib/ai/coach";
import { handler, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";

/** AI-found recurring patterns in the learner's recent mistakes ("You often mix ser/estar"). */
export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  await rateLimit(`patterns:${me.id}`, 30, 3600);
  const items = await db
    .select({
      original: schema.mistakes.original,
      corrected: schema.mistakes.corrected,
      category: schema.mistakes.category,
      tag: schema.mistakes.tag,
    })
    .from(schema.mistakes)
    .where(and(eq(schema.mistakes.userId, me.id), eq(schema.mistakes.language, me.targetLanguage)))
    .orderBy(desc(schema.mistakes.createdAt))
    .limit(40);
  if (items.length < 3) return json({ patterns: [], needMore: 3 - items.length });
  const patterns = await findPatterns(items, me.targetLanguage, me.nativeLanguages[0] ?? "en");
  return json({ patterns, needMore: 0 });
});
