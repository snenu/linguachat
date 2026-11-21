import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { setSessionCookie } from "@/lib/server/session";
import { loginSchema } from "@/lib/validation";

// Compared against when the email doesn't exist, so response time doesn't reveal accounts.
let dummyHash: string | null = null;

export const POST = handler(async (req: Request) => {
  const input = await parseBody(req, loginSchema);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  await rateLimit(`login:${ip}`, 30, 900, "Too many sign-in attempts. Wait a few minutes and try again.");
  await rateLimit(`login:${input.email}`, 10, 900, "Too many sign-in attempts for this account. Wait a few minutes.");

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  dummyHash ??= await bcrypt.hash("not-a-real-password", 11);
  const ok = await bcrypt.compare(input.password, user ? user.passwordHash : dummyHash);
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect", "bad_credentials");

  await setSessionCookie(user.id);
  return json({ ok: true, next: user.onboardedAt ? "/app" : "/onboarding" });
});
