import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { env } from "./env";
import { HttpError } from "./http";

export const SESSION_COOKIE = "lgc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function key() {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const id = await readSessionUserId();
  if (!id) return null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return user ?? null;
}

/** For API routes: the signed-in user or a 401. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in to continue", "unauthorized");
  return user;
}

/** For API routes that need a finished profile (languages chosen). */
export async function requireOnboardedUser(): Promise<User & { targetLanguage: string; targetLevel: string }> {
  const user = await requireUser();
  if (!user.onboardedAt || !user.targetLanguage || !user.targetLevel) {
    throw new HttpError(409, "Finish setting up your profile first", "not_onboarded");
  }
  return user as User & { targetLanguage: string; targetLevel: string };
}
