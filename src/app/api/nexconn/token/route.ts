import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { addToBlocklist, issueToken } from "@/lib/nexconn/server";
import { usersByIds } from "@/lib/server/domain";
import { env } from "@/lib/server/env";
import { handler, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";

/**
 * Returns the Nexconn App Key (public) plus this user's access token.
 * `?refresh=1` re-issues the token (used when the SDK reports 31004 token invalid).
 * A token cached for a different App Key (the Nexconn app was switched) is re-issued, and the
 * learner's blocks are copied into the new app's blocklist.
 */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const appKey = env.nexconnAppKey;
  const newApp = user.nexconnAppKey !== appKey;
  let token = user.nexconnToken;
  if (!token || refresh || newApp) {
    await rateLimit(`nctoken:${user.id}`, 20, 3600);
    token = await issueToken(user.nexconnId, user.displayName, user.avatarUrl);
    await db.update(schema.users).set({ nexconnToken: token, nexconnAppKey: appKey }).where(eq(schema.users.id, user.id));
    if (newApp) await restoreBlocklist(user.id, user.nexconnId);
  }
  return json(
    { appKey, userId: user.nexconnId, token },
    { headers: { "Cache-Control": "no-store" } },
  );
});

async function restoreBlocklist(userId: string, nexconnId: string) {
  const rows = await db.select().from(schema.blocks).where(eq(schema.blocks.blockerId, userId));
  if (rows.length === 0) return;
  const targets = await usersByIds(rows.map((r) => r.blockedId));
  await addToBlocklist(
    nexconnId,
    targets.map((t) => t.nexconnId),
  ).catch((err) => console.warn("[token] blocklist restore", err instanceof Error ? err.message : err));
}
