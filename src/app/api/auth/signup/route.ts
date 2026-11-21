import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { newNexconnId } from "@/lib/server/ids";
import { rateLimit } from "@/lib/server/rate-limit";
import { setSessionCookie } from "@/lib/server/session";
import { signupSchema } from "@/lib/validation";

export const POST = handler(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  await rateLimit(`signup:${ip}`, 30, 3600, "Too many sign-ups from this network. Try again later.");
  const input = await parseBody(req, signupSchema);

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  if (existing.length > 0) throw new HttpError(409, "An account with this email already exists. Sign in instead.", "email_taken");

  const passwordHash = await bcrypt.hash(input.password, 11);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: input.email,
      passwordHash,
      displayName: input.name,
      nexconnId: newNexconnId("u"),
      timezone: input.timezone || "UTC",
      ageConfirmedAt: new Date(),
    })
    .returning({ id: schema.users.id });

  await setSessionCookie(user.id);
  return json({ ok: true, next: "/onboarding" }, { status: 201 });
});
