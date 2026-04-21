import { defineConfig, devices } from "@playwright/test";

const timeoutMinutes = 6;

const IS_PIPELINE = !!process.env.CI;

export default defineConfig({
  timeout: timeoutMinutes * 6e4,
  testDir: "./tests",
  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [["html", { noCopyPrompt: true }]],
  use: {
    baseURL: "http://localhost:3004",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // video: "on",
    testIdAttribute: "data-command",
    actionTimeout: IS_PIPELINE ? 15e3 : 5e3,
  },
  maxFailures: 0,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
