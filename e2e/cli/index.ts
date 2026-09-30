import { test as base } from "../tests/utils/fixtures";
import { defineConfig, devices } from "@playwright/test";
import {
  createTestDeployment,
  type CreateTestDeploymentOptions,
  type TestDeployment,
} from "@prostgles/app/testing";
import type { PageWIds } from "../tests/utils/utils";

export { expect } from "@playwright/test";
export {
  openTable,
  getTableWindow,
  insertRow,
  clickInsertRow,
  fillSmartForm,
  fillSmartFormAndInsert,
  setOrAddWorkspace,
  getDashboardUtils,
  type PageWIds,
  type LocatorWIds,
} from "../tests/utils/utils";

/** One isolated app per test; Playwright owns contexts and recording cleanup. */
export const test = base.extend<{
  deploymentOptions: CreateTestDeploymentOptions;
  userKey: string;
  deployment: TestDeployment;
  app: { page: PageWIds; open: () => Promise<void> };
}>({
  deploymentOptions: [{ configId: "e2e" }, { option: true }],
  userKey: ["admin", { option: true }],
  deployment: [
    async ({ deploymentOptions }, use, testInfo) => {
      const deployment = await createTestDeployment({
        ...deploymentOptions,
        logPath: testInfo.outputPath("deployment.log"),
      });
      try {
        await use(deployment);
      } finally {
        await deployment.dispose();
      }
    },
    { timeout: 120_000 },
  ],
  baseURL: async ({ deployment }, use) => await use(deployment.endpoint),
  storageState: async ({ deployment, userKey }, use) =>
    await use(deployment.storageStateAs(userKey)),
  app: async ({ page, deployment }, use) => {
    await use({
      page: page as PageWIds,
      open: async () => {
        await page.goto(deployment.dashboardUrl);
        await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
      },
    });
  },
});

/** Paths are relative to the generated app's e2e/playwright.config.ts. */
export const defineE2EConfig = () =>
  defineConfig({
    testDir: "./tests",
    outputDir: "./test-results",
    reporter: [
      ["html", { outputFolder: "./playwright-report", open: "never" }],
    ],
    timeout: 120_000,
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    use: {
      ...devices["Desktop Chrome"],
      testIdAttribute: "data-command",
      video: "on",
      trace: "on",
      screenshot: "only-on-failure",
      actionTimeout: 15_000,
    },
  });
