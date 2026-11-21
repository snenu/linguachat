import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { vocabCreateSchema } from "@/lib/validation";

export const GET = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 60);
  const language = sp.get("language")?.slice(0, 5);
  const conditions = [eq(schema.vocabItems.userId, me.id)];
  if (language) conditions.push(eq(schema.vocabItems.language, language));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    conditions.push(or(ilike(schema.vocabItems.term, like), ilike(schema.vocabItems.meaning, like))!);
  }
  const [items, [counts]] = await Promise.all([
    db.select().from(schema.vocabItems).where(and(...conditions)).orderBy(desc(schema.vocabItems.createdAt)).limit(500),
    db
      .select({
        total: sql<number>`count(*)::int`,
        due: sql<number>`count(*) filter (where ${schema.vocabItems.dueAt} <= now())::int`,
        mastered: sql<number>`count(*) filter (where ${schema.vocabItems.intervalDays} >= 21)::int`,
      })
      .from(schema.vocabItems)
      .where(eq(schema.vocabItems.userId, me.id)),
  ]);
  return json({ items, counts });
});

export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, vocabCreateSchema);
  await rateLimit(`vocab:${me.id}`, 300, 3600);
  const termKey = input.term.toLocaleLowerCase();
  const [row] = await db
    .insert(schema.vocabItems)
    .values({ ...input, userId: me.id, termKey })
    .onConflictDoNothing()
    .returning();
  if (!row) throw new HttpError(409, `"${input.term}" is already in your vocabulary`, "duplicate");
  await logActivity(me, "word_saved", input.language, row.id);
  return json(row, { status: 201 });
});
