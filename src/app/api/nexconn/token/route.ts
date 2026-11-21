import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { issueToken } from "@/lib/nexconn/server";
import { env } from "@/lib/server/env";
import { handler, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";

/**
 * Returns the Nexconn App Key (public) plus this user's access token.
 * `?refresh=1` re-issues the token (used when the SDK reports 31004 token invalid).
 */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  let token = user.nexconnToken;
  if (!token || refresh) {
    await rateLimit(`nctoken:${user.id}`, 20, 3600);
    token = await issueToken(user.nexconnId, user.displayName, user.avatarUrl);
    await db.update(schema.users).set({ nexconnToken: token }).where(eq(schema.users.id, user.id));
  }
  return json(
    { appKey: env.nexconnAppKey, userId: user.nexconnId, token },
    { headers: { "Cache-Control": "no-store" } },
  );
});
