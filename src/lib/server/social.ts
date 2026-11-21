import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { compatibility } from "@/lib/compat";
import { MSG, type SignalContent } from "@/lib/nexconn/types";
import { addToBlocklist, sendDirect } from "@/lib/nexconn/server";
import { pair, publicProfile, usersByIds, type PublicProfile } from "./domain";
import { HttpError } from "./http";

export type Relation = "none" | "partner" | "requested" | "incoming";

export interface Candidate {
  profile: PublicProfile;
  score: number;
  tandem: boolean;
  reasons: string[];
  sharedInterests: string[];
  relation: Relation;
  requestId: string | null;
}

/** Relation map between me and other users (partners, pending requests either way). */
export async function relationsFor(me: User) {
  const [parts, reqs] = await Promise.all([
    db
      .select()
      .from(schema.partnerships)
      .where(or(eq(schema.partnerships.userLow, me.id), eq(schema.partnerships.userHigh, me.id))),
    db
      .select()
      .from(schema.chatRequests)
      .where(
        and(
          eq(schema.chatRequests.status, "pending"),
          or(eq(schema.chatRequests.fromUserId, me.id), eq(schema.chatRequests.toUserId, me.id)),
        ),
      ),
  ]);
  const map = new Map<string, { relation: Relation; requestId: string | null }>();
  for (const r of reqs) {
    if (r.fromUserId === me.id) map.set(r.toUserId, { relation: "requested", requestId: r.id });
    else map.set(r.fromUserId, { relation: "incoming", requestId: r.id });
  }
  for (const p of parts) {
    map.set(p.userLow === me.id ? p.userHigh : p.userLow, { relation: "partner", requestId: null });
  }
  return map;
}

export function toCandidate(me: User, other: User, rel?: { relation: Relation; requestId: string | null }): Candidate {
  const c = compatibility(me, other);
  return {
    profile: publicProfile(other),
    score: c.score,
    tandem: c.tandem,
    reasons: c.reasons,
    sharedInterests: c.sharedInterests,
    relation: rel?.relation ?? "none",
    requestId: rel?.requestId ?? null,
  };
}

/** Transient status message telling the other client to refresh requests/partners. */
export async function sendSignal(fromNexconnId: string, toNexconnId: string, kind: SignalContent["kind"]) {
  try {
    await sendDirect({
      fromUserId: fromNexconnId,
      toUserIds: [toNexconnId],
      messageType: MSG.signal,
      content: { kind } satisfies SignalContent,
      persist: false,
    });
  } catch (err) {
    console.warn("[signal] failed", err instanceof Error ? err.message : err);
  }
}

export async function cancelPendingBetween(a: string, b: string) {
  await db
    .update(schema.chatRequests)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(
      and(
        eq(schema.chatRequests.status, "pending"),
        or(
          and(eq(schema.chatRequests.fromUserId, a), eq(schema.chatRequests.toUserId, b)),
          and(eq(schema.chatRequests.fromUserId, b), eq(schema.chatRequests.toUserId, a)),
        ),
      ),
    );
}

export async function createPartnership(a: string, b: string) {
  const [low, high] = pair(a, b);
  await db.insert(schema.partnerships).values({ userLow: low, userHigh: high }).onConflictDoNothing();
}

export async function blockUser(me: User, targetId: string) {
  if (targetId === me.id) throw new HttpError(400, "You can't block yourself", "invalid_input");
  const [target] = await usersByIds([targetId]);
  if (!target) throw new HttpError(404, "User not found", "not_found");
  await db.insert(schema.blocks).values({ blockerId: me.id, blockedId: target.id }).onConflictDoNothing();
  await cancelPendingBetween(me.id, target.id);
  // Nexconn blocklist: the blocked user can no longer send me direct messages.
  await addToBlocklist(me.nexconnId, [target.nexconnId]);
  await sendSignal(me.nexconnId, target.nexconnId, "partners_changed");
  return target;
}

