import { defineConfig, devices } from "@playwright/test";

const timeoutMinutes = 6;

export default defineConfig({
  timeout: timeoutMinutes * 6e4,
  testDir: "./tests",
  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: 0,
  workers: 100,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3004",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    // video: "on",
    testIdAttribute: "data-command",
    actionTimeout: 5e3,
  },
  maxFailures: 0,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ..devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
