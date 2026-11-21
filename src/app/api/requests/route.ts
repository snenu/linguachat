import { and, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { isBlockedEitherWay, partnershipExists, usersByIds } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { sendSignal, toCandidate } from "@/lib/server/social";
import { requestSchema } from "@/lib/validation";

export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const rows = await db
    .select()
    .from(schema.chatRequests)
    .where(
      and(
        eq(schema.chatRequests.status, "pending"),
        or(eq(schema.chatRequests.fromUserId, me.id), eq(schema.chatRequests.toUserId, me.id)),
      ),
    )
    .orderBy(desc(schema.chatRequests.createdAt));
  const others = await usersByIds(rows.map((r) => (r.fromUserId === me.id ? r.toUserId : r.fromUserId)));
  const byId = new Map(others.map((u) => [u.id, u]));
  const shape = (r: (typeof rows)[number]) => {
    const other = byId.get(r.fromUserId === me.id ? r.toUserId : r.fromUserId);
    return other
      ? { id: r.id, intro: r.intro, createdAt: r.createdAt.toISOString(), candidate: toCandidate(me, other) }
      : null;
  };
  return json({
    incoming: rows.filter((r) => r.toUserId === me.id).map(shape).filter(Boolean),
    outgoing: rows.filter((r) => r.fromUserId === me.id).map(shape).filter(Boolean),
  });
});

export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, requestSchema);
  if (input.toUserId === me.id) throw new HttpError(400, "You can't send a request to yourself", "invalid_input");
  await rateLimit(`request:${me.id}`, 40, 86400, "You've sent a lot of requests today. Try again tomorrow.");

  const [target] = await usersByIds([input.toUserId]);
  if (!target || !target.onboardedAt) throw new HttpError(404, "This learner isn't available", "not_found");
  if (await isBlockedEitherWay(me.id, target.id)) throw new HttpError(404, "This learner isn't available", "not_found");
  if (await partnershipExists(me.id, target.id)) throw new HttpError(409, "You're already partners. Open the chat instead.", "already_partners");

  const pending = await db
    .select()
    .from(schema.chatRequests)
    .where(
      and(
        eq(schema.chatRequests.status, "pending"),
        or(
          and(eq(schema.chatRequests.fromUserId, me.id), eq(schema.chatRequests.toUserId, target.id)),
          and(eq(schema.chatRequests.fromUserId, target.id), eq(schema.chatRequests.toUserId, me.id)),
        ),
      ),
    )
    .limit(1);
  if (pending[0]?.fromUserId === me.id) throw new HttpError(409, "Request already sent. Waiting for their reply.", "already_requested");
  if (pending[0]) throw new HttpError(409, "They already sent you a request. Accept it in Requests.", "incoming_exists");

  const [row] = await db
    .insert(schema.chatRequests)
    .values({ fromUserId: me.id, toUserId: target.id, intro: input.intro })
    .returning();
  await sendSignal(me.nexconnId, target.nexconnId, "requests_changed");
  return json({ id: row.id }, { status: 201 });
});
