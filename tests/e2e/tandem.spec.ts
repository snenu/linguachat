import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { deleteAccount, learner, signUpAndOnboard, waitForChat } from "./helpers";

/**
 * Two real learners, two browser contexts, real Nexconn + Gemini:
 * a Hindi speaker learning English (Asha) and an English speaker learning Hindi (Ben).
 */
test.describe.configure({ mode: "serial" });

const asha = learner("Asha", "Hindi", "English", ["Music", "Travel"], 3); // B1
const ben = learner("Ben", "English", "Hindi", ["Travel", "Books"], 2); // A2

let ctxA: BrowserContext;
let ctxB: BrowserContext;
let A: Page;
let B: Page;

const bubble = (p: Page, text: string) => p.getByRole("button", { name: "Message. Activate for actions" }).filter({ hasText: text });
const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/shots/${name}.png`, fullPage: false });

test.beforeAll(async ({ browser }) => {
  ctxA = await browser.newContext();
  ctxB = await browser.newContext();
  A = await ctxA.newPage();
  B = await ctxB.newPage();
});

test.afterAll(async () => {
  // Remove the test learners so they never show up in real users' matches.
  if (process.env.E2E_KEEP_USERS !== "1") {
    await deleteAccount(A);
    await deleteAccount(B);
  }
  await ctxA?.close();
  await ctxB?.close();
});

test("both learners sign up and finish onboarding", async () => {
  await signUpAndOnboard(A, asha);
  await signUpAndOnboard(B, ben);
  await shot(A, "home");
});

test("Ben finds Asha as a tandem match and sends a chat request; Asha accepts", async () => {
  await B.goto("/app/partners");
  const card = B.getByRole("button", { name: new RegExp(`${asha.name}, \\d+% match`) });
  await expect(card).toBeVisible();
  await shot(B, "partners");
  await card.click();
  await expect(B.getByRole("dialog").getByText("Perfect tandem: you can teach each other")).toBeVisible();
  await B.getByLabel("Say hello (optional)").fill("Hi Asha! I can help with English and I'd love to learn Hindi.");
  await B.getByRole("button", { name: "Send chat request" }).click();
  await expect(B.getByText(`Request sent to ${asha.name}`)).toBeVisible();
  await B.keyboard.press("Escape");

  // Asha gets the request in real time (Nexconn status-message signal refreshes the list).
  await A.goto("/app/partners?tab=requests");
  await expect(A.getByText("I can help with English")).toBeVisible();
  await A.getByRole("button", { name: "Accept" }).click();
  await A.waitForURL(/\/app\/chats\/lgcu[0-9a-f]+/);
  await waitForChat(A);
  await expect(A.getByRole("paragraph").filter({ hasText: /You're now tandem partners/ })).toBeVisible();
});

test("real-time chat with check-before-send, AI coach note, typing and read receipts", async () => {
  await waitForChat(B);
  await B.goto("/app/chats");
  await B.getByRole("link", { name: new RegExp(asha.name) }).first().click();
  await expect(B.getByRole("paragraph").filter({ hasText: /You're now tandem partners/ })).toBeVisible();

  // Typing indicator: Ben types, Asha sees it.
  await B.getByRole("textbox", { name: "Message", exact: true }).fill("Hello");
  await expect(A.getByText(new RegExp(`${ben.name} is typing`))).toBeVisible({ timeout: 20_000 });
  await B.getByRole("textbox", { name: "Message", exact: true }).fill("");

  // Asha checks a sentence before sending.
  const sentence = "Yesterday I go to the market with my friend and we buyed mangoes.";
  await A.getByRole("textbox", { name: "Message", exact: true }).fill(sentence);
  await A.getByRole("button", { name: "Check before sending" }).click();
  await expect(A.getByText("Suggested correction")).toBeVisible();
  await shot(A, "check-before-send");
  await A.getByRole("button", { name: "Send mine" }).click();

  // Delivered to Ben in real time through Nexconn.
  await expect(bubble(B, sentence)).toBeVisible();
  // The AI correction arrives as message metadata on both sides.
  await expect(A.getByRole("button", { name: /Coach note/ }).first()).toBeVisible({ timeout: 60_000 });
  await expect(B.getByRole("button", { name: /Coach note for Asha/ }).first()).toBeVisible({ timeout: 60_000 });
  await A.getByRole("button", { name: /Coach note/ }).first().click();
  await expect(A.locator(".corrected").first()).toBeVisible();
  // Ben has the chat open, so Asha's message shows as read.
  await expect(A.getByText("Read", { exact: true })).toBeVisible({ timeout: 30_000 });
  await shot(A, "chat-coach-note");
});

test("Ben sends Asha a manual correction card", async () => {
  await bubble(B, "Yesterday I go").click();
  await B.getByRole("button", { name: "Correct", exact: true }).click();
  const input = B.getByLabel("A native speaker would say");
  await input.fill("Yesterday I went to the market with my friend and we bought mangoes.");
  await B.getByLabel("Why (optional)").fill("Past tense: go → went, buy → bought.");
  await B.getByRole("button", { name: "Send correction card" }).click();
  await expect(B.getByText("You sent a correction")).toBeVisible();
  await expect(B.getByRole("dialog")).toBeHidden();
  await expect(A.getByText(`${ben.name} corrected you`)).toBeVisible();
  await expect(A.getByText("Past tense: go → went, buy → bought.")).toBeVisible();
  await shot(A, "correction-card");
});

test("Asha translates Ben's message and saves a word to her vocabulary", async () => {
  const msg = "Do you like listening to music on weekends?";
  await B.getByRole("textbox", { name: "Message", exact: true }).fill(msg);
  await B.getByRole("button", { name: "Send message" }).click();
  await expect(bubble(A, msg)).toBeVisible();

  await bubble(A, "music on weekends").click();
  await A.getByRole("button", { name: "Translate" }).click();
  await expect(A.locator("p", { has: A.locator("text=Translation:") }).first()).toBeVisible();

  await A.getByRole("button", { name: "weekends", exact: true }).click();
  const dialog = A.getByRole("dialog", { name: "Word" });
  await expect(dialog.getByRole("button", { name: "Save to vocabulary" })).toBeVisible();
  await dialog.getByRole("button", { name: "Save to vocabulary" }).click();
  await expect(dialog.getByRole("button", { name: "Saved to flashcards" })).toBeVisible();
  await shot(A, "word-lookup");
  await A.keyboard.press("Escape");

  // Nexconn message reactions: Asha reacts, Ben sees it arrive live.
  const column = A.locator("div", { has: bubble(A, "music on weekends") }).last();
  const react = column.getByRole("button", { name: "React 👍" });
  if (!(await react.isVisible())) await bubble(A, "music on weekends").click();
  await react.click();
  await expect(A.getByRole("button", { name: "👍 1, including you" })).toBeVisible();
  await expect(B.getByRole("button", { name: "👍 1", exact: true })).toBeVisible();
});

test("Asha sends an HD voice message; it is transcribed and corrected", async () => {
  await A.getByRole("button", { name: "Record voice message" }).click();
  await expect(A.getByText(/Recording 0:0/)).toBeVisible();
  await A.waitForTimeout(5500);
  await A.getByRole("button", { name: "Send voice" }).click();
  await expect(B.locator("audio").first()).toBeVisible({ timeout: 45_000 });
  await expect(A.getByText("Transcript").first()).toBeVisible({ timeout: 90_000 });
  await expect(B.getByText("Transcript").first()).toBeVisible({ timeout: 60_000 });
  await shot(A, "voice-transcript");
});

test("Asha reviews the saved word as an SM-2 flashcard", async () => {
  await A.goto("/app/progress/vocabulary");
  await expect(A.getByText(/weekend/i).first()).toBeVisible();
  await A.goto("/app/progress/review");
  await A.getByRole("button", { name: "Show answer" }).click();
  await A.getByRole("button", { name: /^Good/ }).click();
  await expect(A.getByText(/Session complete|card left|cards left/)).toBeVisible();
  await A.goto("/app/progress/mistakes");
  await expect(A.locator(".strike").first()).toBeVisible();
  await shot(A, "mistake-log");
});

test("Asha practises with the AI tutor (streamed bot replies, inline correction, hints)", async () => {
  await A.goto("/app/tutor");
  await A.getByRole("button", { name: /Ordering at a café/ }).click();
  await expect(A.getByText("New scene")).toBeVisible({ timeout: 60_000 });
  // The tutor's opening line streams in from the bot user.
  const botBubbles = A.locator("[aria-label='Message. Activate for actions']");
  await expect(botBubbles.first()).toBeVisible({ timeout: 60_000 });
  await expect(A.getByRole("textbox", { name: "Message", exact: true })).toBeEnabled();
  await A.getByRole("textbox", { name: "Message", exact: true }).fill("I want one coffee and two croissant, please.");
  await A.getByRole("button", { name: "Send message" }).click();
  await expect(botBubbles).toHaveCount(3, { timeout: 90_000 });
  await A.getByRole("button", { name: "Help me reply" }).click();
  await expect(A.getByText("Things you could say")).toBeVisible({ timeout: 60_000 });
  await shot(A, "tutor");
});

test("both join a practice room; the daily prompt is posted and messages arrive live", async () => {
  await A.goto("/app/rooms/en-b-travel");
  await A.getByRole("button", { name: "Join room" }).click();
  await expect(A.getByText("Today's prompt").first()).toBeVisible({ timeout: 60_000 });
  await B.goto("/app/rooms/en-b-travel");
  await B.getByRole("button", { name: "Join room" }).click();
  await expect(B.getByRole("textbox", { name: "Message", exact: true })).toBeEnabled({ timeout: 60_000 });
  await expect(B.getByText("Today's prompt").first()).toBeVisible();
  const line = "My favourite trip was to Goa with my family.";
  await A.getByRole("textbox", { name: "Message", exact: true }).fill(line);
  await A.getByRole("button", { name: "Send message" }).click();
  await expect(bubble(B, line)).toBeVisible();
  // Sender names resolve from the people directory (not the generic fallback).
  await expect(B.getByText(asha.name).first()).toBeVisible();
  await shot(B, "room");
});

test("progress shows the practice and Ben can block Asha", async () => {
  await A.goto("/app/progress");
  await expect(A.getByText("Messages in English").first()).toBeVisible();
  await shot(A, "progress");

  const partnerHref = await B.evaluate(() => location.pathname);
  expect(partnerHref).toContain("/app/rooms");
  await B.goto("/app/chats");
  await B.getByRole("link", { name: new RegExp(asha.name) }).first().click();
  await B.getByRole("button", { name: "Profile, block or report" }).click();
  await B.getByRole("button", { name: "Block", exact: true }).click();
  await B.getByRole("button", { name: `Block ${asha.name}` }).click();
  await expect(B.getByText(`${asha.name} is blocked`)).toBeVisible();
  await B.goto("/app/partners");
  await expect(B.getByRole("button", { name: new RegExp(`${asha.name}, \\d+% match`) })).toHaveCount(0);
});
