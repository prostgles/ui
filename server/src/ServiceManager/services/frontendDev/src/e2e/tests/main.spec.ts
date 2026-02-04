import { expect, test } from "@playwright/test";
import { startCoverage, stopCoverage } from "./coverage";

test.beforeEach(async ({ page }) => {
  await startCoverage(page);
});

test.afterEach(async ({ page }) => {
  await stopCoverage(page);
});

test.describe("Main test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main page", async ({ page }) => {
    await expect(page.getByText("Available tables:")).toBeVisible();
    await page.waitForTimeout(1000);
  });
});
