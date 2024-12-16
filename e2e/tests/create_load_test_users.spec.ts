import { test } from "@playwright/test";
import { PageWIds, USERS, login } from "./utils";
test.use({
  viewport: { width: 1280, height: 1080 },
  video: {
    mode: "on",
    size: { width: 1280, height: 1080 },
  },
});

const loadUsers = new Array(100).fill(0).map((_, i) => `load_user_${i}`);
test.describe("Create load test users", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", console.log);
    page.on("pageerror", console.error);

    await page.waitForTimeout(100);
  });

  test("Create load test users", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "http://localhost:3004/login");
    await page.evaluate(async (loadUsers) => {
      try {
        const existingLoadUsers = await (window as any).dbs.users.count({
          username: { $in: loadUsers },
        });
        if (+existingLoadUsers > 10) {
          return;
        }
        await (window as any).dbs.users.insert(
          loadUsers.map((username) => ({
            username,
            password: username,
            type: "admin",
            status: "active",
          })),
        );
      } catch (err) {
        document.body.innerText = JSON.stringify(err.message ?? err);
        throw err;
      }
    }, loadUsers);
    await page.waitForTimeout(2100);
  });
});
