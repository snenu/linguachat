import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateUserInfo } from "@/lib/nexconn/server";
import { publicProfile } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { clearSessionCookie, requireUser } from "@/lib/server/session";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";

function me(u: typeof schema.users.$inferSelect) {
  return {
    ...publicProfile(u),
    email: u.email,
    dailyTarget: u.dailyTarget,
    timezone: u.timezone,
    autoCorrect: u.autoCorrect,
    onboarded: !!u.onboardedAt,
  };
}

export type Me = ReturnType<typeof me>;

export const GET = handler(async () => {
  const user = await requireUser();
  return json(me(user));
});

export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, profileSchema);
  const nativeLanguages = input.nativeLanguages ?? user.nativeLanguages;
  const targetLanguage = input.targetLanguage ?? user.targetLanguage;
  if (targetLanguage && nativeLanguages.includes(targetLanguage)) {
    throw new HttpError(400, "The language you're learning can't also be your native language", "invalid_input");
  }
  const values: Partial<typeof schema.users.$inferInsert> = {};
  if (input.name !== undefined) values.displayName = input.name;
  if (input.bio !== undefined) values.bio = input.bio;
  if (input.nativeLanguages) values.nativeLanguages = input.nativeLanguages;
  if (input.targetLanguage) values.targetLanguage = input.targetLanguage;
  if (input.targetLevel) values.targetLevel = input.targetLevel;
  if (input.interests) values.interests = input.interests;
  if (input.goals) values.goals = input.goals;
  if (input.dailyTarget) values.dailyTarget = input.dailyTarget;
  if (input.timezone) values.timezone = input.timezone;
  if (input.autoCorrect !== undefined) values.autoCorrect = input.autoCorrect;

  const complete = nativeLanguages.length > 0 && !!targetLanguage && !!(input.targetLevel ?? user.targetLevel);
  if (!user.onboardedAt && complete) values.onboardedAt = new Date();

  const [updated] = await db.update(schema.users).set(values).where(eq(schema.users.id, user.id)).returning();
  if (input.name && input.name !== user.displayName) {
    await updateUserInfo(user.nexconnId, input.name, updated.avatarUrl);
  }
  return json(me(updated));
});

const deleteSchema = z.object({ confirm: z.literal("DELETE") });

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  await parseBody(req, deleteSchema);
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  await clearSessionCookie();
  return json({ ok: true });
});
