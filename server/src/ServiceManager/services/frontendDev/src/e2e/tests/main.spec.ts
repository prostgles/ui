import { expect, test } from "@playwright/test";
test.describe("Main test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main page", async ({ page }) => {
    await expect(page.getByText("Available tables:")).toBeVisible();
  });
});
