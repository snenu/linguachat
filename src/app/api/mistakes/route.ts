import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { MISTAKE_CATEGORIES } from "@/lib/languages";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";

/** Mistake log: counts per category, most frequent tags, and recent items (optionally filtered). */
export const GET = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const category = new URL(req.url).searchParams.get("category");
  const conditions = [eq(schema.mistakes.userId, me.id), eq(schema.mistakes.language, me.targetLanguage)];
  if (category && (MISTAKE_CATEGORIES as readonly string[]).includes(category)) {
    conditions.push(eq(schema.mistakes.category, category as (typeof MISTAKE_CATEGORIES)[number]));
  }
  const base = and(eq(schema.mistakes.userId, me.id), eq(schema.mistakes.language, me.targetLanguage));
  const [items, byCategory, topTags] = await Promise.all([
    db
      .select({
        id: schema.mistakes.id,
        original: schema.mistakes.original,
        corrected: schema.mistakes.corrected,
        explanation: schema.mistakes.explanation,
        category: schema.mistakes.category,
        tag: schema.mistakes.tag,
        source: schema.mistakes.source,
        createdAt: schema.mistakes.createdAt,
        correctedByName: schema.users.displayName,
      })
      .from(schema.mistakes)
      .leftJoin(schema.users, eq(schema.users.id, schema.mistakes.correctedBy))
      .where(and(...conditions))
      .orderBy(desc(schema.mistakes.createdAt))
      .limit(200),
    db
      .select({ category: schema.mistakes.category, count: sql<number>`count(*)::int` })
      .from(schema.mistakes)
      .where(base)
      .groupBy(schema.mistakes.category),
    db
      .select({ tag: schema.mistakes.tag, category: schema.mistakes.category, count: sql<number>`count(*)::int` })
      .from(schema.mistakes)
      .where(and(base, sql`${schema.mistakes.tag} <> ''`))
      .groupBy(schema.mistakes.tag, schema.mistakes.category)
      .having(sql`count(*) >= 2`)
      .orderBy(desc(sql`count(*)`))
      .limit(6),
  ]);
  return json({ items, byCategory, topTags });
});
