import { defineConfig, devices } from "@playwright/test";

const timeoutMinutes = 2;

const { URL } = process.env;

export default defineConfig({
  timeout: timeoutMinutes * 6e4,
  testDir: "./tests",
  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [["html", { noCopyPrompt: true }]],
  use: {
    browserName: "chromium",
    baseURL:
      URL || "http://URL_environment_variable_needs_to_be_set.localhost:3000",
    trace: "retain-on-failure",
    // video: "retain-on-failure",
    video: "on",
    testIdAttribute: "data-command",
    actionTimeout: 5e3,
  },
  maxFailures: 0,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
