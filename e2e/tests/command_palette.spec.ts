import { expect, test } from "@playwright/test";
import { COMMAND_SEARCH_ATTRIBUTE_NAME } from "./Testing";
import { goTo, login, MINUTE, PageWIds, runDbsSql, USERS } from "./utils";

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

  let flatDocs: any[];
  test.beforeEach(async ({ page: p }) => {
    const page = p as PageWIds;
    page.on("console", console.log);
    page.on("pageerror", console.error);

    if (!flatDocs) {
      if (IS_PIPELINE) {
        // Takes too long. Run locally only
        return;
      }
      await goTo(page, "/");
      await page.waitForTimeout(500);
      flatDocs = await page.evaluate(() => {
        //@ts-ignore
        return window.flatDocs;
      });
      if (!flatDocs || !flatDocs.length) {
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

      const workerFlatDocsBatchSize = Math.ceil(flatDocs.length / workers);
      const startIndex = i * workerFlatDocsBatchSize;
      const workerFlatDocs = flatDocs.slice(
        startIndex,
        startIndex + workerFlatDocsBatchSize,
      ) as {
        title: string;
        parentTitles: string[];
      }[];
      console.log(
        `Worker ${i} has ${workerFlatDocs.length} docs to test`,
        flatDocs.length,
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

const getDocWithDarkModeImgTags = (fileContent: string) => {
  const imgTags = fileContent.split("<img");
  // Must replace all img tags with theme aware src
  if (imgTags.length > 1) {
    imgTags.slice(1).forEach((imgTag, index) => {
      const tagText = "<img" + imgTag.split("/>")[0] + "/>";
      const src = imgTag.split('src="')[1]?.split('"')[0];
      fileContent = fileContent.replaceAll(
        tagText,
        [
          `<picture>`,
          `<source srcset="${src.replace("screenshots/", "screenshots/dark/")}" media="(prefers-color-scheme: dark)">`,
          tagText.replace("/>", `style="border: 1px solid; margin: 1em 0;" />`),
          `</picture>`,
        ].join("\n"),
      );
    });
  }
  return fileContent;
};

const prepare = async (page: PageWIds) => {
  await runDbsSql(
    page,
    "UPDATE database_configs SET table_schema_transform = $1, table_schema_positions = $2 WHERE db_name = 'prostgles_video_demo';",
    [
      {
        scale: 0.6054127940141592,
        translate: {
          x: 255.48757732436974,
          y: 222.24872020228725,
        },
      },
      {
        chats: {
          x: 56.65461492027448,
          y: -48.61370734626732,
        },
        users: {
          x: -386.5771496372805,
          y: -94.50849696823889,
        },
        orders: {
          x: -24.605404166298356,
          y: 149.52211472623705,
        },
        contacts: {
          x: -37.987816516202955,
          y: -274.46819244071696,
        },
        messages: {
          x: 264.9505194760658,
          y: -214.05139083148245,
        },
        chat_members: {
          x: 279.98574299550825,
          y: 50.72883570617583,
        },
      },
    ],
  );
};
