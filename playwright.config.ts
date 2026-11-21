import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against the real stack (Neon, Nexconn, Gemini). Start the app first
 * (`npm run dev` on :3103) or set E2E_BASE_URL to the deployed URL.
 */
const fakeAudio = path.resolve(__dirname, "tests/e2e/fixtures/voice.wav");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 8 * 60 * 1000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3103",
    viewport: { width: 1280, height: 860 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
        permissions: ["microphone"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${fakeAudio}`],
        },
      },
    },
  ],
});
