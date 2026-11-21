import { createClerkClient } from "@clerk/backend";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

export interface Learner {
  name: string;
  email: string;
  password: string;
  native: string; // language name as shown in the UI, e.g. "Hindi"
  learning: string;
  interests: string[];
  agree: number; // how many CEFR self-check statements to tick
}

export function learner(name: string, native: string, learning: string, interests: string[], agree: number): Learner {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  // "+clerk_test" marks the address as a Clerk test email (never emailed).
  return { name: `${name} E2E${id.slice(-4)}`, email: `e2e-${name.toLowerCase()}-${id}+clerk_test@example.com`, password: `pw-${id}-Secure!`, native, learning, interests, agree };
}

const clerkApi = () => createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" });

/**
 * Creates the learner in Clerk, signs in with a Clerk sign-in ticket (the testing token skips
 * bot protection), then completes the 4-step onboarding through the UI.
 */
export async function signUpAndOnboard(page: Page, l: Learner) {
  const [first, ...rest] = l.name.split(" ");
  await clerkApi().users.createUser({
    emailAddress: [l.email],
    password: l.password,
    firstName: first,
    lastName: rest.join(" ") || undefined,
    skipPasswordChecks: true,
  });
  await setupClerkTestingToken({ page });
  await page.goto("/login");
  await clerk.signIn({ page, emailAddress: l.email });
  await page.goto("/onboarding");
  await page.waitForURL("**/onboarding");

  await expect(page.getByLabel("Your name")).toHaveValue(l.name);
  await page.getByRole("checkbox").check(); // 16+ confirmation

  await page.getByRole("group", { name: "Native languages" }).getByRole("button", { name: l.native, exact: true }).click();
  await page.getByRole("radiogroup", { name: "Language to learn" }).getByRole("button", { name: l.learning, exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < l.agree; i++) await boxes.nth(i).check();
  await page.getByRole("button", { name: "Continue" }).click();

  for (const interest of l.interests) {
    await page.getByRole("group", { name: "Interests" }).getByRole("button", { name: interest, exact: true }).click();
  }
  await page.getByRole("group", { name: "Goals" }).getByRole("button", { name: "Career and work" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: /Casual/ }).click();
  await page.getByLabel("A line about you (optional)").fill(`Hi, I'm ${l.name.split(" ")[0]} and I love ${l.interests[0].toLowerCase()}.`);
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(l.name.split(" ")[0]);
}

/** Waits until the Nexconn connection is established (shown in the sidebar). */
export async function waitForChat(page: Page) {
  await expect(page.locator("aside").getByText("Online", { exact: true })).toBeVisible({ timeout: 60_000 });
}

/** Deletes the learner's data and their Clerk user (the API removes both). */
export async function deleteAccount(page: Page) {
  await page.request.delete("/api/me", { data: { confirm: "DELETE" } }).catch(() => undefined);
}
