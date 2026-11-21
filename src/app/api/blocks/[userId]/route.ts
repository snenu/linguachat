import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { removeFromBlocklist } from "@/lib/nexconn/server";
import { usersByIds } from "@/lib/server/domain";
import { handler, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ userId: string }> }) => {
  const me = await requireUser();
  const { userId } = await ctx.params;
  await db.delete(schema.blocks).where(and(eq(schema.blocks.blockerId, me.id), eq(schema.blocks.blockedId, userId)));
  const [target] = await usersByIds([userId]);
  if (target) await removeFromBlocklist(me.nexconnId, [target.nexconnId]);
  return json({ ok: true });
});
