import { test } from "./fixtures";
import { PageWIds, createDatabase, login, runDbSql } from "./utils/utils";
import { demoRestaurantName, USERS } from "utils/constants";
import { goTo } from "utils/goTo";

const videoTestDuration = 10 * 60e3;
test.describe("Demo video setup", () => {
  test.setTimeout(videoTestDuration);

  test("Demo", async ({ page: p }) => {
    const page = p as PageWIds;
    const awaitCondition = async (
      check: () => Promise<boolean>,
      requestedTimeout = 60e3,
    ) => {
      let timeout = requestedTimeout;
      while (timeout > 0) {
        const canBreak = await check();
        if (canBreak) {
          break;
        }
        const waitTime = 2000;
        await page.waitForTimeout(waitTime);
        timeout -= waitTime;
      }
    };
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
    }

    await createDatabase("prostgles_video_demo", page);
    await goTo(page, "http://localhost:3004/connections");
    await createDatabase("food_delivery", page, true);
    let ordersHaveBeenCreated = false;
    await awaitCondition(async () => {
      const { rowCount } = await runDbSql(
        page,
        `
        SELECT * 
        FROM orders o 
        WHERE EXISTS (
          SELECT 1 
          FROM restaurants r 
          WHERE r.name ilike \${demoRestaurantName} 
          AND o.restaurant_id = r.id
        ) 
        LIMIT 2
        `,
        { demoRestaurantName },
        { returnType: "result" },
      );
      ordersHaveBeenCreated = rowCount > 0;
      return ordersHaveBeenCreated;
    }, 220e3);

    if (!ordersHaveBeenCreated) {
      throw new Error(
        "Orders have not been created in food_delivery database after waiting for 60 seconds.",
      );
    }
    await page.waitForTimeout(2000);
    await goTo(page, "http://localhost:3004/connections");
    await createDatabase("crypto", page, true);

    /** If github worker then insert some fake data because the requests will fail */
    if (process.env.CI) {
      await runDbSql(
        page,
        `INSERT INTO futures (symbol, price, timestamp) 
        VALUES 
        ('BTCUSDT', 50000, NOW()  ), 
        ('ETHUSDT', 4000, NOW() ), 
        ('XRPUSDT', 1, NOW() ),
        ('BTCUSDT', 51000, NOW() - INTERVAL '1 hour'), 
        ('ETHUSDT', 4100, NOW() - INTERVAL '1 hour'), 
        ('XRPUSDT', 2, NOW() - INTERVAL '1 hour')
      `,
      );
    }

    let hasXrpData = false;
    await awaitCondition(async () => {
      const xrpRows = await runDbSql(
        page,
        "SELECT * FROM futures WHERE symbol = 'XRPUSDT' LIMIT 2",
        {},
        { returnType: "rows" },
      );
      hasXrpData = xrpRows.length > 0;
      return hasXrpData;
    });

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
  });
});
