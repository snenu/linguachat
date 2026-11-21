import { and, asc, eq, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";

/** Cards due now, oldest due first (max 30 per session). */
export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const cards = await db
    .select()
    .from(schema.vocabItems)
    .where(and(eq(schema.vocabItems.userId, me.id), lte(schema.vocabItems.dueAt, new Date())))
    .orderBy(asc(schema.vocabItems.dueAt))
    .limit(30);
  return json({ cards });
});
