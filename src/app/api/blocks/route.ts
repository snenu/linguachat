import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { publicProfile, usersByIds } from "@/lib/server/domain";
import { handler, json, parseBody } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { blockUser } from "@/lib/server/social";

export const GET = handler(async () => {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(schema.blocks)
    .where(eq(schema.blocks.blockerId, me.id))
    .orderBy(desc(schema.blocks.createdAt));
  const users = await usersByIds(rows.map((r) => r.blockedId));
  return json({ blocked: users.map(publicProfile) });
});

export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  const { userId } = await parseBody(req, z.object({ userId: z.string().uuid() }));
  await blockUser(me, userId);
  return json({ ok: true });
});
