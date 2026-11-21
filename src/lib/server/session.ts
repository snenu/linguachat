import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { HttpError } from "./http";
import { newNexconnId } from "./ids";

/**
 * Sessions belong to Clerk (sign-up, sign-in, email verification, password resets, Google).
 * Our `users` row holds the learner's profile and Nexconn id and is linked by `clerk_user_id`.
 */
export async function getSessionUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.clerkUserId, userId)).limit(1);
  return user ?? provisionUser(userId);
}

/**
 * First request after a Clerk sign-up: create the learner's row. An account created before
 * Clerk with the same verified email is linked instead, so its partners and history carry over.
 */
async function provisionUser(clerkUserId: string): Promise<User | null> {
  const cu = await currentUser();
  if (!cu || cu.id !== clerkUserId) return null;
  const primary = cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId) ?? cu.emailAddresses[0];
  if (!primary) throw new HttpError(400, "Add an email address to your account to continue", "no_email");
  const email = primary.emailAddress.trim().toLowerCase();

  if (primary.verification?.status === "verified") {
    const [legacy] = await db
      .update(schema.users)
      .set({ clerkUserId })
      .where(and(eq(schema.users.email, email), isNull(schema.users.clerkUserId)))
      .returning();
    if (legacy) return legacy;
  }

  const name = (cu.fullName || cu.firstName || cu.username || email.split("@")[0]).trim().slice(0, 40);
  const [created] = await db
    .insert(schema.users)
    .values({
      clerkUserId,
      email,
      displayName: name.length >= 2 ? name : "Learner",
      nexconnId: newNexconnId("u"),
      avatarUrl: cu.hasImage ? cu.imageUrl : null,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // A parallel request created the row first, or the email already belongs to another account.
  const [row] = await db.select().from(schema.users).where(eq(schema.users.clerkUserId, clerkUserId)).limit(1);
  if (row) return row;
  throw new HttpError(409, "This email is already used by another LinguaChat account", "email_taken");
}

/** Removes the Clerk account behind a deleted learner (the database row is deleted by the caller). */
export async function deleteClerkUser(clerkUserId: string | null) {
  if (!clerkUserId) return;
  const client = await clerkClient();
  await client.users.deleteUser(clerkUserId).catch((err) => console.warn("[auth] delete clerk user", err instanceof Error ? err.message : err));
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
