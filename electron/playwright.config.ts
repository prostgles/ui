import { defineConfig } from '@playwright/test' 

const timeoutMinutes = 1;
export default defineConfig({
  timeout: timeoutMinutes * 60e3,
  testDir: './e2e-electron',
  maxFailures: 0,
  workers: 1,
  reporter: 'html',
  retries: 0,
  use: {
    /** https://github.com/microsoft/playwright/issues/27048 */
    trace: "on-first-retry",
    video: "on",
    testIdAttribute: "data-command",
  }
});