import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { vocabUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

function own(id: string, userId: string) {
  return and(eq(schema.vocabItems.id, id), eq(schema.vocabItems.userId, userId));
}

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const input = await parseBody(req, vocabUpdateSchema);
  const [row] = await db.update(schema.vocabItems).set(input).where(own(id, me.id)).returning();
  if (!row) throw new HttpError(404, "Word not found", "not_found");
  return json(row);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  const rows = await db.delete(schema.vocabItems).where(own(id, me.id)).returning({ id: schema.vocabItems.id });
  if (rows.length === 0) throw new HttpError(404, "Word not found", "not_found");
  return json({ ok: true });
});
