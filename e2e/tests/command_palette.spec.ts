import { expect, test } from "./utils/fixtures";
import { COMMAND_SEARCH_ATTRIBUTE_NAME } from "./utils/Testing";
import { login, MINUTE, PageWIds } from "./utils/utils";
import { goTo } from "utils/goTo";
import { IS_GITHUB_WORKER, USERS } from "utils/constants";
import { createTestDeployment } from "../../server/dist/server/src/testing";
import { createConfigTestProject } from "./utils/createConfigTestProject";
import type { SchemaConfig } from "../../server/dist/server/src/schemaConfig";

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

test("Unified search switches commands, views and data", async ({ page }) => {
  const config = {
    id: "unified-search-test",
    tableConfig: {
      search_records: { columns: { id: "serial PRIMARY KEY", name: "text" } },
      other_records: { columns: { id: "serial PRIMARY KEY", name: "text" } },
      ...Object.fromEntries(
        Array.from({ length: 20 }, (_, index) => [
          `overflow_records_${index}`,
          { columns: { id: "serial PRIMARY KEY" } },
        ]),
      ),
    },
    accessControl: [
      {
        userTypes: ["default"],
        dbPermissions: {
          type: "All views/tables",
          allowAllTables: ["select"],
        },
      },
    ],
  } satisfies SchemaConfig;
  const deployment = await createTestDeployment({
    configId: config.id,
    configPath: createConfigTestProject(
      config,
      test.info().outputPath("config"),
    ),
    logPath: test.info().outputPath("deployment.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "reader", type: "default" },
    ],
    seed: async ({ projectDatabase }) => {
      await projectDatabase.query(
        "INSERT INTO search_records (name) VALUES ('Acme search result')",
      );
    },
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    const trigger = page.getByTestId("dashboard.menu.quickSearch");
    const popup = page.getByTestId("CommandPalette");
    const switchMode = async (current: string, next: string) => {
      await popup.getByRole("button", { name: current, exact: true }).click();
      await page.getByText(next, { exact: true }).click();
    };
    /* Only results scroll; the search input and footer stay fixed and visible. */
    const expectFixedSearchControls = async () => {
      const results = popup.getByTestId("SearchList.List");
      const searchInput = popup.getByTestId("SearchAll");
      const footer = popup.locator("footer");
      await expect
        .poll(() =>
          results.evaluate(
            (element) => element.scrollHeight - element.clientHeight,
          ),
        )
        .toBeGreaterThan(0);
      const searchBounds = await searchInput.boundingBox();
      const footerBounds = await footer.boundingBox();
      const resultsBounds = await results.boundingBox();
      expect(resultsBounds!.y + resultsBounds!.height).toBeLessThanOrEqual(
        footerBounds!.y,
      );
      await results.hover();
      await page.mouse.wheel(0, 10000);
      await expect
        .poll(() => results.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await expect(results.getByRole("option").last()).toBeInViewport();
      expect(await searchInput.boundingBox()).toEqual(searchBounds);
      expect(await footer.boundingBox()).toEqual(footerBounds);
      expect(
        await popup
          .getByTestId("Popup.content")
          .evaluate((element) => element.scrollHeight <= element.clientHeight),
      ).toBe(true);
    };
    await expect(trigger).toContainText("Search...");
    await trigger.click();
    await expect(
      popup.getByRole("button", { name: "Commands", exact: true }),
    ).toBeVisible();
    await expect(popup.locator("footer")).toHaveCount(0);

    /* Leading prefixes switch modes, strip the prefix and preserve input focus. */
    const searchInput = popup.locator("input[type='text']");
    for (const [query, mode, expectedQuery] of [
      [">Theme Selector", "Commands", "Theme Selector"],
      ["/ search_records", "Views", "search_records"],
      ["?Acme search result", "Data", "Acme search result"],
      ["? Acme", "Data", "Acme"],
      ["> Theme Selector", "Commands", "Theme Selector"],
      ["plain / text?", "Commands", "plain / text?"],
    ] as const) {
      await searchInput.fill(query);
      await expect(
        popup.getByRole("button", { name: mode, exact: true }),
      ).toBeVisible();
      await expect(searchInput).toHaveValue(expectedQuery);
      await expect(searchInput).toBeFocused();
      if (expectedQuery === "Acme search result") {
        await expect(popup.getByText("name: Acme search result")).toBeVisible();
      }
    }
    /* A typed prefix works before a query; clearing the query keeps its mode. */
    await searchInput.fill("");
    await searchInput.press("/");
    await expect(
      popup.getByRole("button", { name: "Views", exact: true }),
    ).toBeVisible();
    await expect(searchInput).toHaveValue("");
    await expect(searchInput).toBeFocused();
    await searchInput.pressSequentially("search_records");
    await expect(searchInput).toHaveValue("search_records");
    await expect(popup.getByTestId("SearchList.List")).toContainText(
      "search_records",
    );
    await searchInput.fill("");
    await expect(
      popup.getByRole("button", { name: "Views", exact: true }),
    ).toBeVisible();
    await switchMode("Views", "Commands");

    /* Manual mode changes retain the query; Enter opens the matching view. */
    await popup.getByTestId("SearchList.Input").fill("Theme Selector");
    await expect(popup.getByTestId("SearchList.List")).toContainText(
      "Theme Selector",
    );
    await switchMode("Commands", "Views");
    await expect(popup.getByTestId("SearchAll")).toHaveValue("Theme Selector");
    await expect(popup.locator("footer")).toContainText(
      "Tables/Queries/Actions",
    );
    await popup.getByTestId("SearchAll").fill("search_records");
    await popup.getByTestId("SearchAll").press("Enter");
    await expect(popup).toBeHidden();
    await expect(
      page.locator('[data-table-name="search_records"]'),
    ).toBeVisible();

    /* Data search retains its table selection and query across mode changes. */
    await page.keyboard.press("Control+Shift+KeyF");
    await expect(
      popup.getByRole("button", { name: "Data", exact: true }),
    ).toBeVisible();
    await expect(popup.locator("footer")).toContainText("Tables");
    await popup.locator("footer").getByRole("button").click();
    await page
      .getByTestId("SearchList.List")
      .last()
      .getByText("other_records", { exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(popup).toBeVisible();
    await popup.getByTestId("SearchAll").fill("Acme search result");
    await expect(popup.getByText("name: Acme search result")).toBeVisible();
    await switchMode("Data", "Views");
    await expect(popup.getByTestId("SearchAll")).toHaveValue(
      "Acme search result",
    );
    await switchMode("Views", "Data");
    await expect(popup.locator("footer")).toContainText("search_records");
    await expect(popup.locator("footer")).not.toContainText("other_records");
    await expect(popup.getByText("name: Acme search result")).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("unified-search-data.png"),
    });
    /* Commands hide the data footer and execute the selected command. */
    await switchMode("Data", "Commands");
    await expect(popup.getByTestId("SearchList.Input")).toHaveValue(
      "Acme search result",
    );
    await expect(popup.locator("footer")).toHaveCount(0);
    await popup.getByTestId("SearchList.Input").fill("Theme Selector");
    await popup.getByTestId("SearchList.Input").press("Enter");
    await expect(page.locator("body")).toHaveAttribute(
      COMMAND_SEARCH_ATTRIBUTE_NAME,
      "Theme Selector",
    );
    await page.keyboard.press("Escape");
    await page.goto(deployment.dashboardUrl);
    await expect(trigger).toBeVisible();

    /* Keyboard shortcuts reuse one popup and activate the requested mode. */
    for (const [shortcut, mode] of [
      ["Control+KeyP", "Views"],
      ["Control+KeyK", "Commands"],
      ["Control+Shift+KeyF", "Data"],
    ] as const) {
      await page.keyboard.press(shortcut);
      await expect(popup).toHaveCount(1);
      await expect(
        popup.getByRole("button", { name: mode, exact: true }),
      ).toBeVisible();
    }
    /* Desktop and short mobile viewports keep search controls outside scrolling. */
    await page.keyboard.press("Control+KeyP");
    await popup.getByTestId("SearchAll").fill("overflow_records");
    await expectFixedSearchControls();
    await page.setViewportSize({ width: 390, height: 300 });
    await expectFixedSearchControls();
    await page.setViewportSize({ width: 900, height: 600 });
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await trigger.click();
    await expect(
      popup.getByRole("button", { name: "Commands", exact: true }),
    ).toBeVisible();
    /* Every mode fits the mobile viewport without horizontal overflow. */
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(popup).toBeVisible();
    for (const [current, next] of [
      ["Commands", "Views"],
      ["Views", "Data"],
      ["Data", "Commands"],
    ] as const) {
      await switchMode(current, next);
      await expect
        .poll(async () => {
          const bounds = await popup.boundingBox();
          return bounds!.x >= 0 && bounds!.x + bounds!.width <= 390;
        })
        .toBe(true);
      await expect
        .poll(() =>
          popup.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        )
        .toBe(true);
    }
    await page.screenshot({
      path: test.info().outputPath("unified-search-mobile.png"),
    });

    /* Read-only viewers can search but cannot add views to a published workspace. */
    const admin = await deployment.connectStateAs("admin");
    try {
      const workspace = await admin.db.workspaces!.findOne({
        user_id: admin.auth.user!.id,
      });
      await admin.db.workspaces!.update(
        { id: workspace!.id },
        { published: true },
      );
      await admin.db.access_control!.update(
        {},
        {
          dbsPermissions: {
            viewPublishedWorkspaces: { workspaceIds: [workspace!.id] },
          },
        },
      );
      const windowCount = await admin.db.windows!.count();
      await page.context().clearCookies();
      await page
        .context()
        .addCookies(deployment.storageStateAs("reader").cookies);
      await page.setViewportSize({ width: 900, height: 600 });
      await page.goto(deployment.dashboardUrl);
      await expect(trigger).toBeVisible();
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      for (const [shortcut, query] of [
        ["Control+KeyP", "search_records"],
        ["Control+Shift+KeyF", "Acme search result"],
      ] as const) {
        await page.keyboard.press(shortcut);
        await popup.getByTestId("SearchAll").fill(query);
        await expect(popup.getByTestId("SearchList.List")).toContainText(query);
        await popup.getByTestId("SearchAll").press("Enter");
        const alert = page.getByTestId("Alert");
        await expect(alert).toHaveText(
          "You do not have permission to add views to this workspace.OK",
        );
        await alert.getByRole("button", { name: "OK", exact: true }).click();
      }
      expect(await admin.db.windows!.count()).toBe(windowCount);
      expect(pageErrors).toEqual([]);
    } finally {
      admin.disconnect();
    }
  } finally {
    await deployment.dispose();
  }
});

test.describe("Test command palette", () => {
  test.skip(IS_GITHUB_WORKER, "Takes too long. Run locally only");
  test.describe.configure({
    retries: 0,
    mode: "parallel",
    timeout: 15 * MINUTE,
  });

  let flatUIDocs: any[] | undefined;
  test.beforeEach(async ({ page: p }) => {
    const page = p as PageWIds;
    page.on("console", console.log);
    page.on("pageerror", console.error);

    if (!flatUIDocs) {
      await goTo(page, "/");
      await page.waitForTimeout(500);
      flatUIDocs = await page.evaluate(() => {
        //@ts-ignore
        return window.flatUIDocs;
      });
      if (!flatUIDocs.length) {
        throw new Error("No docs found in the command search");
      }
    }

    await page.waitForTimeout(100);
  });

  const workers = 2;
  for (let i = 0; i < workers; i++) {
    test(`Test command search worker: ${i}`, async ({ page: p }) => {
      const page = p as PageWIds;
      if (IS_GITHUB_WORKER) {
        // Takes too long. Run locally only
        return;
      }
      await login(page, USERS.test_user, "/auth/login");

      if (!flatUIDocs) throw new Error("Command search docs were not loaded");
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
