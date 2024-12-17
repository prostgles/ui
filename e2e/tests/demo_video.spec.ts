import { test } from "@playwright/test";
import { PageWIds, USERS, createDatabase, goTo, login } from "./utils";
const viewPortSize = { width: 1920, height: 1080 };
// const viewPortSize = { width: 800, height: 1080 };
test.use({
  viewport: viewPortSize,
  video: {
    mode: "on",
    size: viewPortSize,
  },
  trace: "on",
  launchOptions: {
    args: ["--start-maximized"],
  },
});

const videoTestDuration = 10 * 60e3;
test.describe("Demo video", () => {
  test.setTimeout(videoTestDuration);

  test("Video demo", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.test_user, "/login");
    await page.waitForTimeout(2000);
    // await page.getByTestId("App.colorScheme").click();
    // // await page.getByTestId("App.colorScheme").locator(`[data-key=light]`).click();
    // await page.getByTestId("App.colorScheme").locator(`[data-key=dark]`).click();
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
      await goTo(page, "/connections");
      await createDatabase("food_delivery", page, true);
    }

    const startDemo = async () => {
      await goTo(page, "/connections");
      await page.waitForTimeout(1000);
      const videoDemoConnection = await getVideoDemoConnection();

      await videoDemoConnection.click();
      await page.waitForTimeout(2e3);
      await page
        .getByTestId("AppDemo.start")
        .evaluate(async (node: HTMLButtonElement) => {
          try {
            await (node as any).start();
          } catch (e) {
            console.error(e);
            console.error(JSON.stringify(e));
            throw JSON.stringify(e);
          }
        });
      await page.waitForTimeout(1e3);
    };
    await startDemo();
    // await goTo(page, "/connections");
    // await page.getByTestId("App.colorScheme").click();
    // await page.getByTestId("App.colorScheme").locator(`[data-key=dark]`).click();
    // await startDemo();
  });
});
