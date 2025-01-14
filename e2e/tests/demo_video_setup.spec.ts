import { test } from "@playwright/test";
import { PageWIds, USERS, createDatabase, goTo, login } from "./utils";

const videoTestDuration = 10 * 60e3;
test.describe("Demo video setup", () => {
  test.setTimeout(videoTestDuration);

  test("Demo", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "http://localhost:3004/login");
    await page.waitForTimeout(2000);
    const getVideoDemoConnection = async () => {
      await page.getByRole("link", { name: "Connections" }).click();
      const videoDemoConnection = await page.getByRole("link", {
        name: "prostgles_video_demo",
        exact: true,
      });
      return videoDemoConnection;
    };
    const localVideoDemoConnection = await getVideoDemoConnection();
    if (await localVideoDemoConnection.isVisible()) {
      await localVideoDemoConnection.click();
    } else {
      await createDatabase("prostgles_video_demo", page);
      await goTo(page, "http://localhost:3004/connections");
      await createDatabase("food_delivery", page, true);
      await page.waitForTimeout(2000);
      await goTo(page, "http://localhost:3004/connections");
      await createDatabase("crypto", page, true);
    }
  });
});
