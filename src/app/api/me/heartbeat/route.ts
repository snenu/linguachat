import { touchActive } from "@/lib/server/domain";
import { handler, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

/** Updates last-active time (shown as "active recently"; live presence comes from Nexconn). */
export const POST = handler(async () => {
  const user = await requireUser();
  await touchActive(user.id);
  return json({ ok: true });
});
