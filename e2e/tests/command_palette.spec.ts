import { expect, test } from "@playwright/test";
import { COMMAND_SEARCH_ATTRIBUTE_NAME } from "./Testing";
import { login, MINUTE, PageWIds } from "./utils/utils";
import { goTo } from "utils/goTo";
import { USERS } from "utils/constants";

test.use({
  viewport: {
    width: 900,
    height: 600,
  },
  trace: "retain-on-failure",
  launchOptions: {
    args: ["--start-maximized"],
  },
});

const IS_PIPELINE = process.env.CI === "true";

test.describe("Test command palette", () => {
  test.describe.configure({
    retries: 0,
    mode: "parallel",
    timeout: 15 * MINUTE,
  });

  let flatUIDocs: any[];
  test.beforeEach(async ({ page: p }) => {
    const page = p as PageWIds;
    page.on("console", console.log);
    page.on("pageerror", console.error);

    if (!flatUIDocs) {
      if (IS_PIPELINE) {
        // Takes too long. Run locally only
        return;
      }
      await goTo(page, "/");
      await page.waitForTimeout(500);
      flatUIDocs = await page.evaluate(() => {
        //@ts-ignore
        return window.flatUIDocs;
      });
      if (!flatUIDocs || !flatUIDocs.length) {
        throw new Error("No docs found in the command search");
      }
    }

    await page.waitForTimeout(100);
  });

  const workers = 2;
  for (let i = 0; i < workers; i++) {
    test(`Test command search worker: ${i}`, async ({ page: p }) => {
      const page = p as PageWIds;
      if (IS_PIPELINE) {
        // Takes too long. Run locally only
        return;
      }
      await login(page, USERS.test_user, "/login");

      const workerFlatDocsBatchSize = Math.ceil(flatUIDocs.length / workers);
      const startIndex = i * workerFlatDocsBatchSize;
      const workerFlatDocs = flatUIDocs.slice(
        startIndex,
        startIndex + workerFlatDocsBatchSize,
      ) as {
        title: string;
        parentTitles: string[];
      }[];
      console.log(
        `Worker ${i} has ${workerFlatDocs.length} docs to test`,
        flatUIDocs.length,
      );
      await page.waitForTimeout(500);

      if (!workerFlatDocs.length) {
        throw new Error("No docs found in the command search");
      }

      const batchSize = 50;
      do {
        const batchItems = workerFlatDocs.splice(0, batchSize);
        await page.reload();
        await page.waitForTimeout(1500);
        console.log(`Remaining docs: ${workerFlatDocs.length}`);
        for (const [indx, doc] of batchItems.entries()) {
          if (doc.title === "Logout") {
            continue; // Skip logout as it will close the session
          }

          console.log(doc.parentTitles.join(" > ") + " -", doc.title);
          await page.keyboard.press("Control+KeyK", { delay: 100 });
          await page
            .getByTestId("CommandPalette")
            .locator("input")
            .fill(doc.title);
          await page.waitForTimeout(200);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(200);

          await expect(page.locator("body")).toHaveAttribute(
            COMMAND_SEARCH_ATTRIBUTE_NAME,
            doc.title,
            { timeout: 15_000 },
          );
          await page.evaluate((COMMAND_SEARCH_ATTRIBUTE_NAME) => {
            document.body.removeAttribute(COMMAND_SEARCH_ATTRIBUTE_NAME);
          }, COMMAND_SEARCH_ATTRIBUTE_NAME);

          /** Close any popups */
          await page.keyboard.press("Escape", { delay: 100 });
          await page.keyboard.press("Escape", { delay: 100 });
          await page.waitForTimeout(100);
        }
      } while (workerFlatDocs.length > 0);
    });
  }
});
