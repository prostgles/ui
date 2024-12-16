import { defineConfig } from "@playwright/test";

const timeoutMinutes = 2;
export default defineConfig({
  timeout: timeoutMinutes * 60e3,
  testDir: "./e2e-electron",
  maxFailures: 0,
  workers: 1,
  reporter: "list",
  retries: 0,
  use: {
    /** https://github.com/microsoft/playwright/issues/27048 */
    trace: "off",
    video: "off",
    testIdAttribute: "data-command",
  },
});
