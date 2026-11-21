import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Correction } from "@/lib/ai/coach";

type Source = (typeof schema.mistakeSource.enumValues)[number];

/**
 * Saves a correction to the learner's mistake log. Skips duplicates: the same message+source,
 * or the same original sentence logged in the last 30 minutes (e.g. "Check" then send).
 */
export async function logMistake(opts: {
  userId: string;
  language: string;
  original: string;
  correction: Pick<Correction, "corrected" | "explanation" | "category" | "tag">;
  source: Source;
  messageId?: string | null;
  correctedBy?: string | null;
}) {
  const recent = await db
    .select({ id: schema.mistakes.id })
    .from(schema.mistakes)
    .where(
      and(
        eq(schema.mistakes.userId, opts.userId),
        eq(schema.mistakes.original, opts.original),
        gt(schema.mistakes.createdAt, new Date(Date.now() - 30 * 60 * 1000)),
      ),
    )
    .limit(1);
  if (recent.length > 0 && opts.source !== "partner") return;
  await db
    .insert(schema.mistakes)
    .values({
      userId: opts.userId,
      language: opts.language,
      original: opts.original.slice(0, 1000),
      corrected: opts.correction.corrected.slice(0, 1000),
      explanation: opts.correction.explanation.slice(0, 400),
      category: opts.correction.category,
      tag: opts.correction.tag.slice(0, 60),
      source: opts.source,
      messageId: opts.messageId ?? null,
      correctedBy: opts.correctedBy ?? null,
    })
    .onConflictDoNothing();
}
