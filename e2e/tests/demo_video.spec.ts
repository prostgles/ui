import { expect, test } from "@playwright/test";
import { type AnyObject } from "prostgles-types";
import { USERS } from "utils/constants";
import { goTo } from "utils/goTo";
import {
  PageWIds,
  createDatabase,
  login,
  openConnection,
  runDbSql,
  runDbsSql,
  setupProstglesLLMProvider,
} from "./utils/utils";
// const viewPortSize = { width: 1920, height: 1080 };
const viewPortSize = { width: 1280, height: 1080 };
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
    const CI = !!process.env.CI;
    await page.addInitScript(
      ({ CI }) => {
        (window as any).CI = CI;
      },
      { CI },
    );
    await login(page, USERS.test_user, "/login");
    await page.waitForTimeout(2000);

    await runDbsSql(
      page,
      `
        UPDATE connections
        SET on_mount_ts_disabled = true
        WHERE name IN ('food_delivery', 'crypto')
      `,
    );
    await runDbsSql(
      page,
      `
        UPDATE connections
        SET on_mount_ts_disabled = false
        WHERE name IN ('food_delivery', 'crypto')
      `,
    );
    await openConnection(page, "crypto");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.methods").click();
    await page.getByTestId("ServerSideFunctions.onMountEnabled").click();
    await expect(
      page.getByTestId("ServerSideFunctions.onMountEnabled"),
    ).toHaveAttribute("aria-checked", "true");

    const getVideoDemoConnection = async () => {
      await goTo(page, "/connections");
      const videoDemoConnection = await page.getByRole("link", {
        name: "prostgles_video_demo",
        exact: true,
      });
      return videoDemoConnection;
    };

    const localVideoDemoConnection = await getVideoDemoConnection();
    await localVideoDemoConnection.click({ timeout: 10000 });

    await setupProstglesLLMProvider(page);

    const startDemo = async (theme: "dark" | "light") => {
      await goTo(page, "/connections");
      await page.getByTestId("App.colorScheme").click();
      await page
        .getByTestId("App.colorScheme")
        .locator(`[data-key=${theme}]`)
        .click();
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
            console.error(e, JSON.stringify(e));
            await new Promise((res) => setTimeout(res, 10e3));
            const errorObj = Object.getOwnPropertyNames(
              typeof e !== "object" ? { error: e } : e,
            ).reduce(
              (acc, key) => ({
                ...acc,
                [key]: (e as AnyObject)[key],
              }),
              {},
            );
            throw JSON.stringify(errorObj);
          }
        });
      await page.waitForTimeout(1e3);
    };
    await startDemo("light");
  });

  test(`Backup databases`, async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "/login");
    await openConnection(page, "prostgles_video_demo");
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await page.getByTestId("config.bkp.create").click();
    await page.getByTestId("config.bkp.create.name").fill("Demo");
    await page.getByTestId("config.bkp.create.start").click();
  });
});
