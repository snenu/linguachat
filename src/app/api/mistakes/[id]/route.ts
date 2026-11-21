import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const rows = await db
    .delete(schema.mistakes)
    .where(and(eq(schema.mistakes.id, id), eq(schema.mistakes.userId, me.id)))
    .returning({ id: schema.mistakes.id });
  if (rows.length === 0) throw new HttpError(404, "Not found", "not_found");
  return json({ ok: true });
});
