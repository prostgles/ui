import { test } from "@playwright/test";
import { PageWIds, createDatabase, login, runDbSql } from "./utils/utils";
import { USERS } from "utils/constants";
import { goTo } from "utils/goTo";

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
      let xrp_fetch_timeout = 60e3;
      let hasXrpData = false;
      while (xrp_fetch_timeout > 0) {
        const xrpRows = await runDbSql(
          page,
          "SELECT * FROM futures WHERE symbol = 'XRPUSDT' LIMIT 2",
          {},
          { returnType: "rows" },
        );
        hasXrpData = xrpRows.length > 0;
        if (hasXrpData) {
          break;
        }
        const waitTime = 2000;
        await page.waitForTimeout(waitTime);
        xrp_fetch_timeout -= waitTime;
      }
      if (!hasXrpData) {
        const xrpRows = await runDbSql(
          page,
          "SELECT DISTINCT symbol FROM futures ",
          {},
          { returnType: "rows" },
        );
        throw new Error(
          "XRP data not available in crypto database after waiting for 60 seconds." +
            JSON.stringify(xrpRows),
        );
      }
    }
  });
});
