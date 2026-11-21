import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { languageName } from "@/lib/languages";
import { MSG, type NoticeContent } from "@/lib/nexconn/types";
import { sendDirect } from "@/lib/nexconn/server";
import { isBlockedEitherWay, usersByIds } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { createPartnership, sendSignal } from "@/lib/server/social";
import { requestActionSchema } from "@/lib/validation";

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const { action } = await parseBody(req, requestActionSchema);
  const [request] = await db.select().from(schema.chatRequests).where(eq(schema.chatRequests.id, id)).limit(1);
  if (!request || request.status !== "pending") throw new HttpError(404, "This request is no longer pending", "not_found");

  if (action === "cancel") {
    if (request.fromUserId !== me.id) throw new HttpError(403, "Only the sender can cancel a request", "forbidden");
  } else if (request.toUserId !== me.id) {
    throw new HttpError(403, "Only the recipient can answer a request", "forbidden");
  }

  const otherId = request.fromUserId === me.id ? request.toUserId : request.fromUserId;
  const [other] = await usersByIds([otherId]);
  if (!other) throw new HttpError(404, "This learner isn't available", "not_found");

  const status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
  if (action === "accept" && (await isBlockedEitherWay(me.id, other.id))) {
    throw new HttpError(403, "You can't accept a request from a blocked user", "forbidden");
  }
  await db.update(schema.chatRequests).set({ status, respondedAt: new Date() }).where(eq(schema.chatRequests.id, id));

  if (action === "accept") {
    await createPartnership(me.id, other.id);
    const describe = (u: User) =>
      `${u.displayName} speaks ${u.nativeLanguages.map(languageName).join(" and ")} and is learning ${languageName(u.targetLanguage)}`;
    const notice: NoticeContent = {
      kind: "accepted",
      text: `You're now tandem partners. ${describe(other)}. ${describe(me)}. Say hello!`,
    };
    // Sent as the accepting user so the direct channel appears for both people.
    await sendDirect({
      fromUserId: me.nexconnId,
      toUserIds: [other.nexconnId],
      messageType: MSG.notice,
      content: notice as unknown as Record<string, unknown>,
      pushContent: `${me.displayName} accepted your chat request`,
      echoToSender: true,
    }).catch((err) => console.warn("[accept] notice failed", err instanceof Error ? err.message : err));
    await sendSignal(me.nexconnId, other.nexconnId, "partners_changed");
  } else {
    await sendSignal(me.nexconnId, other.nexconnId, "requests_changed");
  }
  return json({ ok: true, status, partner: action === "accept" ? { id: other.id, nexconnId: other.nexconnId } : null });
});
