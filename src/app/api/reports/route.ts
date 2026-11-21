import { db, schema } from "@/db";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";
import { blockUser } from "@/lib/server/social";
import { reportSchema } from "@/lib/validation";

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const input = await parseBody(req, reportSchema);
  if (input.userId === me.id) throw new HttpError(400, "You can't report yourself", "invalid_input");
  await rateLimit(`report:${me.id}`, 20, 86400);
  await db.insert(schema.reports).values({
    reporterId: me.id,
    reportedId: input.userId,
    reason: input.reason,
    details: input.details,
  });
  if (input.alsoBlock) await blockUser(me, input.userId);
  return json({ ok: true }, { status: 201 });
});
