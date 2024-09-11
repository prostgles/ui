import { defineConfig } from '@playwright/test' 

const timeoutMinutes = 6;
export default defineConfig({
  timeout: timeoutMinutes * 60e3,
  testDir: './e2e-electron',
  maxFailures: 0,
  workers: 1,
  reporter: 'html',
  use: {
    // trace: "on-first-retry",
    video: "on",
    testIdAttribute: "data-command",
  }
});