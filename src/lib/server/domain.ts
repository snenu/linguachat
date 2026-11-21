import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { localDay } from "@/lib/day";
import { TUTOR_PERSONAS, languageName, type LanguageCode } from "@/lib/languages";
import { issueToken } from "@/lib/nexconn/server";
import { botId } from "./ids";
import { HttpError } from "./http";

export type ActivityKind = (typeof schema.activityKind.enumValues)[number];

/** Records a practice event on the learner's local calendar day. `ref` dedupes (e.g. a message id). */
export async function logActivity(user: Pick<User, "id" | "timezone">, kind: ActivityKind, language?: string | null, ref?: string) {
  await db
    .insert(schema.activity)
    .values({ userId: user.id, kind, language: language ?? null, day: localDay(user.timezone), ref: ref ?? null })
    .onConflictDoNothing();
}

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  nativeLanguages: string[];
  targetLanguage: string | null;
  targetLevel: string | null;
  interests: string[];
  goals: string[];
  nexconnId: string;
  lastActiveAt: string | null;
}

export function publicProfile(u: User): PublicProfile {
  return {
    id: u.id,
    name: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    nativeLanguages: u.nativeLanguages,
    targetLanguage: u.targetLanguage,
    targetLevel: u.targetLevel,
    interests: u.interests,
    goals: u.goals,
    nexconnId: u.nexconnId,
    lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
  };
}

export function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Ids of users I blocked or who blocked me. */
export async function blockedIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(schema.blocks)
    .where(or(eq(schema.blocks.blockerId, userId), eq(schema.blocks.blockedId, userId)));
  return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const rows = await db
    .select({ x: schema.blocks.blockerId })
    .from(schema.blocks)
    .where(
      or(
        and(eq(schema.blocks.blockerId, a), eq(schema.blocks.blockedId, b)),
        and(eq(schema.blocks.blockerId, b), eq(schema.blocks.blockedId, a)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function partnershipExists(a: string, b: string): Promise<boolean> {
  const [low, high] = pair(a, b);
  const rows = await db
    .select({ id: schema.partnerships.id })
    .from(schema.partnerships)
    .where(and(eq(schema.partnerships.userLow, low), eq(schema.partnerships.userHigh, high)))
    .limit(1);
  return rows.length > 0;
}

export async function userByNexconnId(nexconnId: string): Promise<User | null> {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.nexconnId, nexconnId)).limit(1);
  return u ?? null;
}

export async function usersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  return db.select().from(schema.users).where(inArray(schema.users.id, ids));
}

/** My accepted partners (excluding anyone blocked either way). */
export async function myPartners(userId: string): Promise<User[]> {
  const rows = await db
    .select()
    .from(schema.partnerships)
    .where(or(eq(schema.partnerships.userLow, userId), eq(schema.partnerships.userHigh, userId)));
  const ids = rows.map((r) => (r.userLow === userId ? r.userHigh : r.userLow));
  const blocked = await blockedIds(userId);
  return (await usersByIds(ids.filter((id) => !blocked.has(id)))).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// ---- Bots -------------------------------------------------------------------------------------

const registeredBots = new Set<string>();

async function ensureBot(id: string, name: string) {
  if (registeredBots.has(id)) return;
  await issueToken(id, name);
  registeredBots.add(id);
}

export interface BotInfo {
  nexconnId: string;
  name: string;
  language: string;
}

export function tutorBot(language: string): BotInfo {
  const persona = TUTOR_PERSONAS[language as LanguageCode] ?? "Tutor";
  return { nexconnId: botId(`tutor${language}`), name: `${persona} (AI ${languageName(language)} tutor)`, language };
}

export async function ensureTutorBot(language: string): Promise<BotInfo> {
  const bot = tutorBot(language);
  await ensureBot(bot.nexconnId, bot.name);
  return bot;
}

export function roomHostBot(): BotInfo {
  return { nexconnId: botId("roomhost"), name: "LinguaChat room host", language: "" };
}

export async function ensureRoomHostBot(): Promise<BotInfo> {
  const bot = roomHostBot();
  await ensureBot(bot.nexconnId, bot.name);
  return bot;
}

/** Validates that `channelId` is a direct channel I'm allowed to use: a partner or my tutor bot. */
export async function assertDirectAccess(me: User, channelId: string): Promise<{ kind: "partner"; partner: User } | { kind: "tutor"; bot: BotInfo }> {
  if (me.targetLanguage && channelId === tutorBot(me.targetLanguage).nexconnId) {
    return { kind: "tutor", bot: tutorBot(me.targetLanguage) };
  }
  const partner = await userByNexconnId(channelId);
  if (!partner || !(await partnershipExists(me.id, partner.id)) || (await isBlockedEitherWay(me.id, partner.id))) {
    throw new HttpError(403, "You can only do this in your own conversations", "forbidden");
  }
  return { kind: "partner", partner };
}

export async function assertRoomMember(me: User, groupId: string) {
  const [row] = await db
    .select({ roomId: schema.rooms.id, language: schema.rooms.language })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .where(and(eq(schema.rooms.groupId, groupId), eq(schema.roomMembers.userId, me.id)))
    .limit(1);
  if (!row) throw new HttpError(403, "Join the room first", "forbidden");
  return row;
}

export async function touchActive(userId: string) {
  await db.execute(sql`update users set last_active_at = now() where id = ${userId}`);
}
