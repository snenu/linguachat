import { and, arrayOverlaps, desc, ilike, inArray, isNotNull, ne, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { LANGUAGE_CODES, LEVELS } from "@/lib/languages";
import { blockedIds } from "@/lib/server/domain";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { relationsFor, toCandidate } from "@/lib/server/social";

/**
 * Discover partners. Default: native speakers of my target language (tandem first).
 * Query: lang (their native language), levels (comma list of their learning level),
 * interest, tandem=1 (must also learn one of my native languages), q (name search).
 */
export const GET = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const sp = new URL(req.url).searchParams;
  const lang = (LANGUAGE_CODES as readonly string[]).includes(sp.get("lang") ?? "") ? sp.get("lang")! : me.targetLanguage;
  const levels = (sp.get("levels") ?? "").split(",").filter((l) => (LEVELS as readonly string[]).includes(l));
  const interest = sp.get("interest")?.slice(0, 40) || null;
  const tandemOnly = sp.get("tandem") === "1";
  const q = sp.get("q")?.trim().slice(0, 40) || null;

  const conditions = [
    ne(schema.users.id, me.id),
    isNotNull(schema.users.onboardedAt),
    arrayOverlaps(schema.users.nativeLanguages, [lang]),
  ];
  if (tandemOnly) conditions.push(inArray(schema.users.targetLanguage, me.nativeLanguages));
  if (levels.length > 0) conditions.push(inArray(schema.users.targetLevel, levels));
  if (interest) conditions.push(arrayOverlaps(schema.users.interests, [interest]));
  if (q) conditions.push(or(ilike(schema.users.displayName, `%${q.replace(/[%_]/g, "")}%`))!);

  const [rows, blocked, relations] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(desc(schema.users.lastActiveAt))
      .limit(200),
    blockedIds(me.id),
    relationsFor(me),
  ]);

  const candidates = rows
    .filter((u) => !blocked.has(u.id))
    .map((u) => toCandidate(me, u, relations.get(u.id)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  return json({ language: lang, candidates });
});

export const dynamic = "force-dynamic";
