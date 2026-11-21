import { handler, json } from "@/lib/server/http";
import { clearSessionCookie } from "@/lib/server/session";

export const POST = handler(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
