import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { nextDue, sm2 } from "@/lib/sm2";
import { reviewSchema } from "@/lib/validation";

/** Grades a flashcard (SM-2) and schedules the next review. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const { grade } = await parseBody(req, reviewSchema);
  const [card] = await db
    .select()
    .from(schema.vocabItems)
    .where(and(eq(schema.vocabItems.id, id), eq(schema.vocabItems.userId, me.id)))
    .limit(1);
  if (!card) throw new HttpError(404, "Card not found", "not_found");

  const next = sm2({ ease: card.ease, intervalDays: card.intervalDays, repetitions: card.repetitions }, grade);
  const now = new Date();
  const [updated] = await db
    .update(schema.vocabItems)
    .set({ ...next, dueAt: nextDue(grade, next.intervalDays, now), lastReviewedAt: now })
    .where(eq(schema.vocabItems.id, card.id))
    .returning();
  await db.insert(schema.reviewLogs).values({ userId: me.id, vocabId: card.id, grade });
  await logActivity(me, "review", card.language, `${card.id}:${now.getTime()}`);
  return json(updated);
});
