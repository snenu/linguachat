import { clerkSetup } from "@clerk/testing/playwright";

/** Fetches a Clerk testing token (bypasses bot protection) using the keys in .env.local. */
export default async function globalSetup() {
  await clerkSetup();
}
