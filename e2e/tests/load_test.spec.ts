import { test } from "@playwright/test";
import { PageWIds, login } from "./utils";
test.use({
  viewport: { width: 1280, height: 1080 },
  video: {
    mode: "on",
    size: { width: 1280, height: 1080 },
  },
});

test.describe.serial("Load test first cache", () => {
  test("Load test first cache", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, "load_user_0", "http://localhost:3004/login");
  });
});
const loadUsers = new Array(22).fill(0).map((_, i) => `load_user_${i}`);
test.describe.configure({ mode: "parallel" });
for (const [idx, user] of loadUsers.entries()) {
  test.describe("Load test_" + idx, () => {
    test("Load test", async ({ page: p }) => {
      const page = p as PageWIds;
      await login(page, user, "http://localhost:3004/login");
      await page.waitForTimeout(2000);
      const getVideoDemoConnection = async () => {
        await page
          .getByRole("link", { name: "Connections" })
          .click({ timeout: 10e3 });
        const videoDemoConnection = await page.getByRole("link", {
          name: "prostgles_video_demo",
          exact: true,
        });
        return videoDemoConnection;
      };
      const localVideoDemoConnection = await getVideoDemoConnection();
      if (await localVideoDemoConnection.isVisible()) {
        await localVideoDemoConnection.click();
      }

      // await page.getByTestId("AppDemo.start")
      //   .evaluate(async (node: HTMLButtonElement) => {
      //     try {
      //       await (node as any).start();
      //     } catch (e) {
      //       console.error(e);
      //       console.error(JSON.stringify(e));
      //       throw JSON.stringify(e);
      //     }
      //   });
      await page.waitForTimeout(20e3);
    });
  });
}
