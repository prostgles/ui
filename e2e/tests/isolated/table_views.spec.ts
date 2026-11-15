import { createTestDeployment } from "../../../server/dist/server/src/testing";
import type { GeoJsonLayer } from "../../../client/node_modules/deck.gl";
import type { SelectParams, SQLHandler } from "prostgles-types";
import { getDataKey } from "../utils/Testing";
import { QUERIES } from "../utils/constants";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { createVectorBasemapFixture } from "../utils/createVectorBasemapFixture";
import {
  closeWorkspaceWindows,
  getSearchListItem,
  getTableWindow,
  setOrAddWorkspace,
  setWspColLayout,
  TWENTY_SECONDS_OR_MORE,
} from "../utils/utils";
import { expect, test } from "./fixtures";

test("Table counts are inferred and never block rows or run when disabled", async ({
  page,
}) => {
  const configId = "table-counts-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      connection: {
        table_options: { count_records: { card: { headerColumn: "id" } } },
      },
      tableConfig: {
        count_records: {
          columns: {
            id: "integer PRIMARY KEY",
            category: "integer GENERATED ALWAYS AS (id % 2) STORED",
          },
        },
      },
    }),
    logPath: test.info().outputPath("table-counts-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      await projectDatabase.query(
        "INSERT INTO count_records SELECT generate_series(1, 31)",
      );
      await stateDatabase.query(`
        INSERT INTO workspaces (name, user_id, connection_id, last_updated, options)
        SELECT 'Table counts', users.id, connections.id, 1, '{}'::jsonb
        FROM users, connections
        WHERE users.username = 'admin' AND connections.name = '${configId}';
        INSERT INTO windows (workspace_id, user_id, type, table_name, name, last_updated, filter, options)
        SELECT id, user_id, 'table', 'count_records', 'count_records', 1,
          '[{"fieldName":"id","type":"<=","value":25}]'::jsonb,
          '{"refresh":{"type":"None"},"showFilters":true}'::jsonb
        FROM workspaces WHERE name = 'Table counts';
      `);
    },
  });
  try {
    const { db } = await deployment.connectStateAs("admin");
    const workspacesHandler = db.workspaces;
    const windowsHandler = db.windows;
    if (!workspacesHandler || !windowsHandler) {
      throw new Error("Expected workspace and window handlers");
    }
    const workspace = await workspacesHandler.findOne({ name: "Table counts" });
    if (!workspace) throw new Error("Expected the table counts workspace");
    const tableWindow = await windowsHandler.findOne({
      workspace_id: workspace.id,
    });
    if (!tableWindow) throw new Error("Expected the table counts view");
    const table = page.locator(`[data-box-id="${tableWindow.id}"]`);
    const rows = table.locator(".d-row");
    const pageCountInfo = table.getByTestId("Pagination.pageCountInfo");
    const pendingCounts: (() => void)[] = [];
    const pendingNextPages: (() => void)[] = [];
    const pendingRowFailures: (() => void)[] = [];
    const findRequests: Pick<SelectParams, "limit" | "offset">[] = [];
    let countRequests = 0;
    let subscriptionRequests = 0;
    let blockCounts = true;
    let blockNextPages = false;
    let failNextRows = false;
    let failNextSubscription = false;
    await page.routeWebSocket(
      (url) => url.pathname.startsWith("/ws-api/"),
      (socket) => {
        const server = socket.connectToServer();
        socket.onMessage((message) => {
          if (
            typeof message === "string" &&
            message.startsWith("42") &&
            message.includes('"tableName":"count_records"')
          ) {
            const [, request] = JSON.parse(
              message.slice(message.indexOf("[")),
            ) as [unknown, { command: string; param2?: SelectParams }];
            const failRequest = () => {
              const acknowledgementId = message.slice(2, message.indexOf("["));
              socket.send(
                `43${acknowledgementId}${JSON.stringify([
                  {
                    message: "Simulated table request timeout",
                    code: "57014",
                  },
                  null,
                ])}`,
              );
            };
            if (
              request.command === "subscribe" &&
              request.param2?.limit === 0
            ) {
              subscriptionRequests++;
              if (failNextSubscription) {
                failNextSubscription = false;
                failRequest();
                return;
              }
            }
            if (request.command === "find" && !request.param2?.groupBy) {
              findRequests.push({
                limit: request.param2?.limit,
                offset: request.param2?.offset,
              });
              if (blockNextPages && request.param2?.limit === 1) {
                pendingNextPages.push(failRequest);
                return;
              }
              if (failNextRows && request.param2?.limit === 25) {
                failNextRows = false;
                pendingRowFailures.push(failRequest);
                return;
              }
            }
            if (request.command === "count" && request.param2?.select) {
              countRequests++;
              if (blockCounts) {
                pendingCounts.push(() => server.send(message));
                return;
              }
            }
          }
          server.send(message);
        });
      },
    );
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(`${deployment.dashboardUrl}?workspaceId=${workspace.id}`);

    await test.step("An exact page infers the total without a count", async () => {
      await expect(rows).toHaveCount(25);
      await expect(pageCountInfo).toContainText("25 rows");
      await expect(
        table.getByTitle("Count Records 25", { exact: true }),
      ).toBeVisible();
      expect(countRequests).toBe(0);
      expect(findRequests).toEqual(
        expect.arrayContaining([
          { limit: 25, offset: 0 },
          { limit: 1, offset: 25 },
        ]),
      );
      expect(
        findRequests.every(({ limit }) => limit != null && limit <= 25),
      ).toBe(true);
      await expect(table.getByTestId("Pagination.nextPage")).toBeDisabled();
    });

    await test.step("A slow count leaves the fetched page visible", async () => {
      await windowsHandler.update({ id: tableWindow.id }, { filter: [] });
      await expect.poll(() => pendingCounts.length).toBe(1);
      await expect(rows).toHaveCount(25);
      await expect(pageCountInfo).toBeEmpty();
      await expect(table.getByTestId("Pagination.lastPage")).toHaveCount(0);
      await table.getByTestId("SmartFilterBar.rightOptions.show").click();
      await table.getByTestId("SmartFilterBar.rightOptions.update").click();
      await expect(
        page.getByText("Update matching rows", { exact: true }),
      ).toBeVisible();
      await page.getByTestId("Popup.close").last().click();
      await expect(
        table.getByTitle("Count Records 25", { exact: true }),
      ).toBeVisible();
      blockCounts = false;
      pendingCounts.splice(0).forEach((sendCount) => sendCount());
      await expect(pageCountInfo).toContainText("31 rows");
      await expect(
        table.getByTitle("Count Records 31", { exact: true }),
      ).toBeVisible();
      expect(countRequests).toBe(1);
      await expect(table.getByTestId("Pagination.lastPage")).toBeVisible();
    });

    await test.step("The final page infers the total including its offset", async () => {
      await table.getByTestId("Pagination.nextPage").click();
      await expect(rows).toHaveCount(6);
      await expect(pageCountInfo).toContainText("31 rows");
      expect(countRequests).toBe(1);
    });

    await test.step("Disabling counts preserves navigation without queries", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        { options: { ...tableWindow.options, hideCount: true } },
      );
      await expect(
        table.getByTitle("Count Records", { exact: true }),
      ).toBeVisible();
      await table.getByTestId("Pagination.firstPage").click();
      await expect(rows).toHaveCount(25);
      await expect(pageCountInfo).toBeEmpty();
      expect(countRequests).toBe(1);
      await expect(table.getByTestId("Pagination.lastPage")).toHaveCount(0);
      await table.getByTestId("Pagination.nextPage").click();
      await expect(rows).toHaveCount(6);
      await expect(table.getByTestId("Pagination.nextPage")).toBeDisabled();
      expect(countRequests).toBe(1);
    });

    await test.step("Workspace counts and the table override take effect immediately", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        { options: tableWindow.options },
      );
      await expect(
        table.getByTitle("Count Records 31", { exact: true }),
      ).toBeVisible();
      await workspacesHandler.update(
        { id: workspace.id },
        { options: { ...workspace.options, hideCounts: true } },
      );
      await expect(
        table.getByTitle("Count Records", { exact: true }),
      ).toBeVisible();
      await table.getByTestId("Pagination.firstPage").click();
      await expect(rows).toHaveCount(25);
      await expect(pageCountInfo).toBeEmpty();
      expect(countRequests).toBe(1);
      await windowsHandler.update(
        { id: tableWindow.id },
        { options: { ...tableWindow.options, hideCount: false } },
      );
      await expect(pageCountInfo).toContainText("31 rows");
      expect(countRequests).toBe(2);
    });

    await test.step("Empty results infer zero without a count", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        { filter: [{ fieldName: "id", type: "=", value: 0 }] },
      );
      await expect(rows).toHaveCount(0);
      await expect
        .poll(
          async () =>
            (await windowsHandler.findOne({ id: tableWindow.id }))?.name,
        )
        .toBe("Count Records 0");
      expect(countRequests).toBe(2);
    });

    await test.step("A full final page disables Next without a count", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 25 }],
          options: { ...tableWindow.options, hideCount: true },
        },
      );
      await expect(rows).toHaveCount(25);
      await expect(table.getByTestId("Pagination.nextPage")).toBeDisabled();
      expect(countRequests).toBe(2);
    });

    await test.step("Grouped cards infer the total when every group fits", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [],
          options: {
            ...tableWindow.options,
            viewAs: { type: "card", cardGroupBy: "category" },
          },
        },
      );
      await expect(table.getByTestId("CardView.row")).toHaveCount(31);
      await expect(pageCountInfo).toContainText("31 rows");
      await expect(pageCountInfo).not.toContainText("pages");
      await expect(table.getByTestId("Pagination.nextPage")).toBeDisabled();
      await expect(table.getByTestId("Pagination.lastPage")).toHaveCount(0);
      expect(countRequests).toBe(2);
    });

    await test.step("A capped group list does not imply an exact row count", async () => {
      const { db: projectDb } = await deployment.connectProjectAs("admin");
      const recordsHandler = projectDb.count_records;
      if (!recordsHandler?.insert) throw new Error("Expected insert access");
      await recordsHandler.insert(
        Array.from({ length: 970 }, (_, index) => ({ id: index + 32 })),
      );
      blockCounts = true;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: ">", value: 0 }],
          options: {
            ...tableWindow.options,
            hideCount: false,
            viewAs: { type: "card", cardGroupBy: "id" },
          },
        },
      );
      await expect
        .poll(() => pendingCounts.length, TWENTY_SECONDS_OR_MORE)
        .toBe(1);
      await expect(pageCountInfo).toBeEmpty();
      blockCounts = false;
      pendingCounts.splice(0).forEach((sendCount) => sendCount());
      await expect(pageCountInfo).toContainText("1,001 rows");
      expect(countRequests).toBe(3);
    });

    await test.step("Realtime refreshes preserve pagination while recounting", async () => {
      const { db: projectDb } = await deployment.connectProjectAs("admin");
      const recordsHandler = projectDb.count_records;
      if (!recordsHandler?.insert) throw new Error("Expected insert access");
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [],
          sort: [{ key: "id", asc: false }],
          options: {
            ...tableWindow.options,
            hideCount: false,
            refresh: { type: "Realtime", throttleSeconds: 0 },
          },
        },
      );
      await expect(rows).toHaveCount(25);
      await expect(pageCountInfo).toContainText("1,001 rows");
      const lastPageButton = table.getByTestId("Pagination.lastPage");
      await expect(lastPageButton).toBeVisible();
      blockCounts = true;
      await recordsHandler.insert({ id: 1002 });
      await expect.poll(() => pendingCounts.length).toBeGreaterThan(0);
      await expect(rows.first()).toContainText("1,002");
      await expect(pageCountInfo).toContainText("1,001 rows");
      await expect(lastPageButton).toBeVisible();
      await expect(lastPageButton).toBeEnabled();
      blockCounts = false;
      pendingCounts.splice(0).forEach((sendCount) => sendCount());
      await expect(pageCountInfo).toContainText("1,002 rows");
      await expect(lastPageButton).toBeVisible();
    });

    await test.step("Realtime refresh can be disabled and enabled again for the same query", async () => {
      const { db: projectDb } = await deployment.connectProjectAs("admin");
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          options: {
            ...tableWindow.options,
            hideCount: true,
            refresh: { type: "None" },
          },
        },
      );
      await expect(
        table.getByTitle("Count Records", { exact: true }),
      ).toBeVisible();
      await projectDb.count_records!.insert!({ id: 1003 });
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          options: {
            ...tableWindow.options,
            refresh: { type: "Realtime", throttleSeconds: 0 },
          },
        },
      );
      await expect(rows.first()).toContainText("1,003");
    });

    await test.step("Retry restores a failed realtime subscription without resubscribing on notifications", async () => {
      const { db: projectDb } = await deployment.connectProjectAs("admin");
      failNextSubscription = true;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: ">=", value: 1 }],
          options: {
            ...tableWindow.options,
            hideCount: true,
            refresh: { type: "Realtime", throttleSeconds: 0 },
          },
        },
      );
      await expect(table.getByTestId("ErrorComponent")).toContainText(
        "Simulated table request timeout",
      );
      const failedSubscriptionRequests = subscriptionRequests;
      await table.getByRole("button", { name: "Retry", exact: true }).click();
      await expect
        .poll(() => subscriptionRequests)
        .toBe(failedSubscriptionRequests + 1);
      await expect(table.getByTestId("ErrorComponent")).not.toBeVisible();
      await projectDb.count_records!.insert!({ id: 1004 });
      await expect(rows.first()).toContainText("1,004");
      expect(subscriptionRequests).toBe(failedSubscriptionRequests + 1);
    });

    await test.step("Realtime card updates preserve open details and scroll position", async () => {
      const { db: projectDb } = await deployment.connectProjectAs("admin");
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          options: {
            ...tableWindow.options,
            hideCount: true,
            viewAs: { type: "card" },
            refresh: { type: "Realtime", throttleSeconds: 0 },
          },
        },
      );
      const cards = table.getByTestId("CardView.row");
      await expect(cards).toHaveCount(25);
      await cards.first().locator(".CardHeader button.ta-left").click();
      const details = page.locator(".DetailedCardPopup");
      await expect(details).toBeVisible();
      const cardColumn = table.locator(".CardView_Column");
      await cardColumn.evaluate((element) => {
        element.scrollTop = 80;
      });
      await expect
        .poll(() => cardColumn.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await projectDb.count_records!.insert!({ id: 1005 });
      await expect(cards.first()).toContainText("1,005");
      await expect(details).toBeVisible();
      await expect
        .poll(() => cardColumn.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await page.keyboard.press("Escape");
      await expect(details).not.toBeVisible();
    });

    await test.step("A pending or failed next-page query preserves rows and can be retried", async () => {
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 24 }],
          options: { ...tableWindow.options, hideCount: true },
        },
      );
      await expect(rows).toHaveCount(24);
      blockNextPages = true;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 25 }],
        },
      );
      await expect.poll(() => pendingNextPages.length).toBeGreaterThan(0);
      await expect(rows).toHaveCount(25);
      blockNextPages = false;
      pendingNextPages.splice(0).forEach((failRequest) => failRequest());
      await expect(table.getByTestId("ErrorComponent")).toContainText(
        "Simulated table request timeout",
      );
      await expect(rows).toHaveCount(25);
      await table.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(table.getByTestId("ErrorComponent")).not.toBeVisible();
      await expect(rows).toHaveCount(25);
      await expect(table.getByTestId("Pagination.nextPage")).toBeDisabled();
    });

    await test.step("A delayed failed request does not leave the next filter empty", async () => {
      failNextRows = true;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 1 }],
        },
      );
      await expect.poll(() => pendingRowFailures.length).toBe(1);
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 2 }],
        },
      );
      await expect(rows).toHaveCount(2);
      pendingRowFailures.splice(0).forEach((failRequest) => failRequest());
      await expect(rows).toHaveCount(2);
      await expect(table.getByTestId("ErrorComponent")).not.toBeVisible();
    });

    await test.step("A failed row query retries the same filter without reloading", async () => {
      failNextRows = true;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          filter: [{ fieldName: "id", type: "<=", value: 3 }],
        },
      );
      await expect.poll(() => pendingRowFailures.length).toBe(1);
      pendingRowFailures.splice(0).forEach((failRequest) => failRequest());
      await expect(table.getByTestId("ErrorComponent")).toContainText(
        "Simulated table request timeout",
      );
      await table.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(rows).toHaveCount(3);
      await expect(table.getByTestId("ErrorComponent")).not.toBeVisible();
    });

    await test.step("Disabling interval refresh stops further row requests", async () => {
      const initialRequests = findRequests.length;
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          options: {
            ...tableWindow.options,
            hideCount: true,
            refresh: { type: "Interval", intervalSeconds: 0.1 },
          },
        },
      );
      await expect
        .poll(() => findRequests.length)
        .toBeGreaterThan(initialRequests + 1);
      await windowsHandler.update(
        { id: tableWindow.id },
        {
          options: {
            ...tableWindow.options,
            hideCount: true,
            refresh: { type: "None" },
          },
        },
      );
      await page.waitForTimeout(300);
      const stoppedRequests = findRequests.length;
      await page.waitForTimeout(400);
      expect(findRequests.length).toBe(stoppedRequests);
    });
  } finally {
    await deployment.dispose();
  }
});

test("Smart forms confirm discarding unsaved changes with an opaque dialog", async ({
  page,
}) => {
  const configId = "smart-form-close-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      tableConfig: {
        form_records: {
          columns: {
            id: "serial PRIMARY KEY",
            name: "text DEFAULT 'Untitled'",
            notes:
              "text DEFAULT 'A saved note that is long enough to open in a multiline input.'",
            tags: "text[] DEFAULT ARRAY['alpha', 'beta']",
          },
        },
      },
    }),
    logPath: test.info().outputPath("smart-form-close-server.log"),
    seed: async ({ projectDatabase }) => {
      await projectDatabase.query(
        "INSERT INTO form_records (name) VALUES ('Saved')",
      );
    },
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await setOrAddWorkspace(page, "Smart forms");
    await getSearchListItem(page, { dataKey: "form_records" }).click();
    const table = getTableWindow(page, "form_records");
    const form = page.getByTestId("SmartForm");
    const nameInput = form
      .getByTestId("SmartFormField")
      .and(page.locator(getDataKey("name")))
      .locator("textarea, input");
    const confirmation = page.getByRole("dialog").filter({
      has: page.getByTestId("SmartForm.close.confirm"),
    });

    await test.step("Insert defaults close immediately; edited drafts require confirmation from every close control", async () => {
      await table.getByTestId("dashboard.window.rowInsert").click();
      await expect(nameInput).toHaveValue("Untitled");
      await form.getByTestId("SmartForm.close").click();
      await expect(form).toHaveCount(0);

      await table.getByTestId("dashboard.window.rowInsert").click();
      await nameInput.fill("Draft");
      const closeActions = [
        () => form.getByTestId("SmartForm.close").click(),
        () => page.getByTestId("Popup.close").click(),
        () => page.keyboard.press("Escape"),
        () =>
          page
            .getByTestId("ClickCatchOverlay")
            .click({ position: { x: 1, y: 1 } }),
      ];
      for (const closeForm of closeActions) {
        await closeForm();
        await expect(confirmation).toBeVisible();
        await expect(confirmation).toHaveCSS("opacity", "1");
        await expect(confirmation).toHaveCSS("background-color", /^rgb\(/);
        await confirmation.getByRole("button", { name: "Cancel" }).click();
        await expect(confirmation).toHaveCount(0);
        await expect(nameInput).toHaveValue("Draft");
      }

      await nameInput.fill("Untitled");
      await form.getByTestId("SmartForm.close").click();
      await expect(form).toHaveCount(0);

      await table.getByTestId("dashboard.window.rowInsert").click();
      await nameInput.fill("Discarded draft");
      await form.getByTestId("SmartForm.close").click();
      await page.getByTestId("SmartForm.close.confirm").click();
      await expect(form).toHaveCount(0);
      await expect(table.locator(".d-row")).toHaveCount(1);
    });

    await test.step("Text inputs and textareas preserve native undo and redo", async () => {
      await table.getByTestId("dashboard.window.viewEditRow").click();
      const notesInput = form
        .getByTestId("SmartFormField")
        .and(page.locator(getDataKey("notes")))
        .locator("textarea");
      for (const input of [nameInput, notesInput]) {
        const savedValue = await input.inputValue();
        await input.focus();
        await input.press("ControlOrMeta+End");
        await input.pressSequentially("draft");
        await expect(input).toHaveValue(`${savedValue}draft`);
        /* Browsers can split a typing sequence into multiple undo steps. */
        let undoCount = 0;
        while ((await input.inputValue()) !== savedValue && undoCount < 5) {
          const currentValue = await input.inputValue();
          await input.press("ControlOrMeta+z");
          await expect(input).not.toHaveValue(currentValue);
          undoCount++;
        }
        await expect(input).toHaveValue(savedValue);
        for (let index = 0; index < undoCount; index++) {
          await input.press("ControlOrMeta+Shift+z");
        }
        await expect(input).toHaveValue(`${savedValue}draft`);
        for (let index = 0; index < undoCount; index++) {
          await input.press("ControlOrMeta+z");
        }
        await expect(input).toHaveValue(savedValue);
      }
      await form.getByTestId("SmartForm.close").click();
      await expect(form).toHaveCount(0);
    });

    await test.step("Array edits preserve the caret and chips match the input size", async () => {
      await table.getByTestId("dashboard.window.viewEditRow").click();
      const arrayEditor = form
        .getByTestId("SmartFormField")
        .and(page.locator(getDataKey("tags")))
        .locator(".ChipArrayEditor");
      const firstChip = arrayEditor.locator(".chip-component").first();
      const firstInput = firstChip.locator("input");
      await expect(firstChip).toHaveCSS("height", "32px");
      await expect(firstInput).toHaveCSS("font-size", "14px");
      await expect(firstChip.locator(":scope > svg")).toHaveCSS(
        "cursor",
        "grab",
      );
      await firstInput.click();
      await firstInput.press("Home");
      await firstInput.press("ArrowRight");
      await firstInput.pressSequentially("XY");
      await expect(firstInput).toHaveValue("aXYlpha");
      await expect(firstInput).toHaveJSProperty("selectionStart", 3);
      await firstInput.press("Shift+ArrowLeft");
      await firstInput.press("Shift+ArrowLeft");
      await firstInput.pressSequentially("Z");
      await expect(firstInput).toHaveValue("aZlpha");
      await expect(firstInput).toHaveJSProperty("selectionStart", 2);
      await firstInput.press("Backspace");
      await expect(firstInput).toHaveValue("alpha");
      await expect(firstInput).toHaveJSProperty("selectionStart", 1);
      await firstInput.press("ControlOrMeta+z");
      await expect(firstInput).toHaveValue("aZlpha");
      await firstInput.press("ControlOrMeta+Shift+z");
      await expect(firstInput).toHaveValue("alpha");
      await form.getByTestId("SmartForm.close").click();
      await expect(form).toHaveCount(0);
    });

    await test.step("Discarding updates preserves the saved row; reverting edits and saving close without a discard prompt", async () => {
      await table.getByTestId("dashboard.window.viewEditRow").click();
      await expect(nameInput).toHaveValue("Saved");
      await nameInput.fill("Discarded update");
      await form.getByTestId("SmartForm.close").click();
      await expect(confirmation).toBeVisible();
      await page.getByTestId("SmartForm.close.confirm").click();
      await expect(form).toHaveCount(0);

      await table.getByTestId("dashboard.window.viewEditRow").click();
      await expect(nameInput).toHaveValue("Saved");
      await nameInput.fill("Changed");
      await nameInput.fill("Saved");
      await form.getByTestId("SmartForm.close").click();
      await expect(form).toHaveCount(0);

      await table.getByTestId("dashboard.window.viewEditRow").click();
      await nameInput.fill("Updated");
      await form.getByTestId("SmartForm.update").click();
      await page.getByTestId("SmartForm.update.confirm").click();
      await expect(form.getByText("Updated!", { exact: true })).toBeVisible();
      await page.getByTestId("Popup.close").click();
      await expect(confirmation).toHaveCount(0, { timeout: 0 });
      await expect(form).toHaveCount(0);
      await expect(table.getByText("Updated", { exact: true })).toBeVisible();
    });

    await test.step("Saved inserts close during the success message without a discard prompt", async () => {
      await table.getByTestId("dashboard.window.rowInsert").click();
      await nameInput.fill("Inserted");
      await form.getByTestId("SmartForm.insert").click();
      await expect(form.getByText("Inserted!", { exact: true })).toBeVisible();
      await page.getByTestId("Popup.close").click();
      await expect(confirmation).toHaveCount(0, { timeout: 0 });
      await expect(form).toHaveCount(0);
      await expect(table.getByText("Inserted", { exact: true })).toBeVisible();
    });
  } finally {
    await deployment.dispose();
  }
});

test("Time chart tooltips survive SVG captures in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  const configId = "timechart-svg-tooltip-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({
      id: configId,
      tableConfig: {
        measurements: {
          columns: {
            measured_at: "timestamp",
            value: "integer",
            symbol: "text",
          },
        },
      },
    }),
    logPath: test.info().outputPath("timechart-svg-tooltip-server.log"),
    seed: async ({ stateDatabase, projectDatabase }) => {
      await projectDatabase.query(`
        INSERT INTO measurements
        SELECT now() - i * interval '1 hour', i + series, series::text
        FROM generate_series(0, 168) i, generate_series(1, 3) series;
      `);
      await stateDatabase.query(`
        INSERT INTO workspaces (name, user_id, connection_id, last_updated, options)
        SELECT 'Time chart tooltip', users.id, connections.id, 1, '{}'::jsonb
        FROM users, connections
        WHERE users.username = 'admin' AND connections.name = '${configId}';
        INSERT INTO windows (workspace_id, user_id, type, table_name, name, last_updated, options)
        SELECT id, user_id, 'timechart', 'measurements', 'Measurements', 1, '{}'::jsonb
        FROM workspaces WHERE name = 'Time chart tooltip';
        INSERT INTO links (w1_id, w2_id, workspace_id, user_id, last_updated, options)
        SELECT id, id, workspace_id, user_id, 1, '{"type":"timechart","groupByColumn":"symbol","columns":[{"name":"measured_at","statType":{"funcName":"$avg","numericColumn":"value"},"colorArr":[0,129,167,255]}],"dataSource":{"type":"local-table","localTableName":"measurements"}}'::jsonb
        FROM windows WHERE name = 'Measurements';
      `);
    },
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    const canvas = page.locator(".TimeChart canvas");
    await expect(canvas).toBeVisible();
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          element._drawn?.shapes.some((shape) => shape.type === "multiline"),
        ),
      )
      .toBe(true);
    await page.evaluate(() => window.toSVG(document.body));
    await canvas.hover();
    await canvas.click();
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) =>
          element._drawn?.shapes.some(
            (shape) => shape.id === "tooltipBottomDateLabel",
          ),
        ),
      )
      .toBe(true);
    const tooltipDate = await canvas.evaluate((element: HTMLCanvasElement) => {
      const tooltip = element._drawn?.shapes.find(
        (shape) => shape.id === "tooltipBottomDateLabel",
      );
      return tooltip?.type === "text" ? tooltip.text : undefined;
    });
    if (!tooltipDate) throw new Error("Expected a tooltip date");
    const screenshots = await page.evaluate(() => window.toSVG(document.body));
    if (!screenshots) throw new Error("Expected SVG screenshots");
    for (const screenshot of [screenshots.light, screenshots.dark]) {
      expect(screenshot).toContain(`>${tooltipDate}</text>`);
    }
  } finally {
    await deployment.dispose();
  }
});

test("Table tests", async ({ page }) => {
  test.skip(!!process.env.ONLY_VIDEO, "Only recording videos");
  const configId = "table-views-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({ id: configId, tableConfig: {} }),
    logPath: test.info().outputPath("table-views-server.log"),
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);

    const wspName = "Table tests";
    await setOrAddWorkspace(page, wspName);
    await closeWorkspaceWindows(page);
    await setWspColLayout(page);

    const query = `
      CREATE EXTENSION IF NOT EXISTS postgis;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE users (id UUID  PRIMARY KEY, first_name text, last_name text, email text, created_at timestamp default now(), type TEXT DEFAULT 'default', position numeric);
      ${QUERIES.orders}
      ALTER TABLE orders 
      ADD COLUMN total_cost NUMERIC NOT NULL DEFAULT random() * 100;
      ALTER TABLE orders ADD COLUMN delivery_address GEOGRAPHY DEFAULT st_point(-0.08 + random()/10, 51.5 + random()/10)::GEOGRAPHY;
      ALTER TABLE orders
      ADD COLUMN created_at timestamp default now() + (random() * 10 * '1day'::interval);
      ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users;
      INSERT INTO users (id, first_name, last_name, email, type, position)
      SELECT 
        user_id, 
        "left"(user_id::TEXT, 8), 
        "right"(user_id::TEXT, 8), 
        "left"(user_id::TEXT, 8) || "right"(user_id::TEXT, 8) || '@gmail.com',  
        CASE WHEN rownumid = 1 THEN 'default' WHEN rownumid = 2 THEN 'admin' WHEN random() < .5 THEN 'default' ELSE 'admin' END, 
        row_number() over()
      FROM (
        SELECT *, row_number() over( PARTITION BY user_id) as dpid, row_number() over() as rownumid
        FROM (
          SELECT rownum, gen_random_uuid() as user_id
          FROM generate_series(1, 1e2) as rownum
        ) t
      ) t1
      WHERE dpid = 1;
      
      INSERT INTO orders (user_id, status)
      SELECT u.id, 'completed'
      FROM (
        SELECT rownum 
        FROM generate_series(1, 1e2) as rownum
      ) t
      LEFT JOIN users u ON true;
      `;
    await page.evaluate(async (query) => {
      try {
        await (window as any).sql(query);
      } catch (err) {
        document.body.innerText = JSON.stringify(err);
      }
    }, query);

    await getSearchListItem(page, { dataKey: "users" }).click();
    const usersTable = await getTableWindow(page, "users");

    await test.step("Column resize clears its highlight when released over table rows", async () => {
      const columnHeader = usersTable
        .getByTestId("TableHeader")
        .locator(getDataKey("id"));
      const columnBounds = await columnHeader.boundingBox();
      if (!columnBounds) {
        throw new Error("Expected a visible column header");
      }
      const resizeStartX = columnBounds.x + columnBounds.width - 3;
      const resizeStartY = columnBounds.y + columnBounds.height / 2;
      await page.mouse.move(resizeStartX, resizeStartY);
      await page.mouse.down();
      await expect(columnHeader).toHaveClass(/resizing-ew/);
      await page.mouse.move(resizeStartX + 40, resizeStartY + 50, {
        steps: 5,
      });
      await page.mouse.up();
      await expect(columnHeader).not.toHaveClass(/resizing-ew/);
      await expect
        .poll(() =>
          columnHeader.evaluate(
            (header) => header.getBoundingClientRect().width,
          ),
        )
        .toBeGreaterThan(columnBounds.width);
    });

    await test.step("View resize works after repeatedly locking and unlocking the layout", async () => {
      await getSearchListItem(page, { dataKey: "orders" }).click();
      const ordersTable = await getTableWindow(page, "orders");
      const viewResizer = page.locator(".silver-grid-resizer");
      const layoutToggle = page.getByTestId(
        "WorkspaceMenu.toggleWorkspaceLayoutMode",
      );
      await expect(layoutToggle).toHaveAttribute("aria-pressed", "false");
      await expect(viewResizer).toHaveCount(1);
      const getPreviousViewHeight = () =>
        viewResizer.evaluate(
          (resizer) =>
            resizer.previousElementSibling!.getBoundingClientRect().height,
        );

      for (const isFixedLayout of [true, false, true, false]) {
        await layoutToggle.click();
        await expect(layoutToggle).toHaveAttribute(
          "aria-pressed",
          String(isFixedLayout),
        );
        await expect(viewResizer).toHaveCSS(
          "cursor",
          isFixedLayout ? "default" : "ns-resize",
        );
        const resizerBounds = (await viewResizer.boundingBox())!;
        const previousViewHeight = await getPreviousViewHeight();
        const startX = resizerBounds.x + resizerBounds.width / 2;
        const startY = resizerBounds.y + resizerBounds.height / 2;
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 60, { steps: 5 });
        await page.mouse.up();

        if (isFixedLayout) {
          expect(await getPreviousViewHeight()).toBe(previousViewHeight);
        } else {
          await expect
            .poll(getPreviousViewHeight)
            .toBeGreaterThan(previousViewHeight + 40);
        }
      }

      await ordersTable.getByTestId("dashboard.window.close").click();
      await expect(ordersTable).toHaveCount(0);
    });

    /** Test pagination */
    let pageInput = await usersTable.getByTestId("Pagination.page");
    await expect(pageInput).toHaveValue("1");
    await expect(pageInput).toHaveAttribute("min", "1");
    await expect(pageInput).toHaveAttribute("max", "4");
    await expect(
      usersTable.getByTestId("Pagination.pageCountInfo"),
    ).toContainText(`4 pages  (100 rows)`);
    await usersTable.getByTestId("Pagination.lastPage").click();
    pageInput = await usersTable.getByTestId("Pagination.page");
    await pageInput.scrollIntoViewIfNeeded();
    await expect(pageInput).toHaveValue("4");
    await usersTable.getByTestId("Pagination.firstPage").click();
    await expect(pageInput).toHaveValue("1");
    await usersTable.getByTestId("Pagination.nextPage").click();
    await expect(pageInput).toHaveValue("2");
    await usersTable.getByTestId("Pagination.lastPage").click();
    await usersTable.getByTestId("Pagination.pageSize").click();
    await page
      .getByTestId("Pagination.pageSize")
      .locator(getDataKey("50"))
      .click();
    await expect(pageInput).toHaveValue("2");
    await expect(usersTable.getByTestId("Pagination.pageCountInfo")).toHaveText(
      `2 pages  (100 rows)`,
    );

    await usersTable.getByTestId("AddColumnMenu").click();
    await getSearchListItem(page.getByTestId("AddColumnMenu"), {
      dataKey: "Referenced",
    }).click();
    await getSearchListItem(page.getByTestId("JoinPathSelectorV2"), {
      dataKey: "orders",
    }).click(TWENTY_SECONDS_OR_MORE);
    await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
    await page.waitForTimeout(1e3);
    await getSearchListItem(page, { dataKey: "total_cost" })
      .getByTestId("SummariseColumn.toggle")
      .click();
    await page.waitForTimeout(1e3);
    await getSearchListItem(page.getByTestId("FunctionSelector"), {
      dataKey: "$sum",
    }).click();
    await page.getByTestId("SummariseColumn.apply").click();
    await page
      .getByTestId("LinkedColumn.ColumnListMenu")
      .getByTestId("Popup.close")
      .click();
    await page.getByTestId("LinkedColumn.Add").click();

    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddColumnMenu").click();
    await getSearchListItem(page.getByTestId("AddColumnMenu"), {
      dataKey: "Referenced",
    }).click();
    await getSearchListItem(page.getByTestId("JoinPathSelectorV2"), {
      dataKey: "orders",
    }).click(TWENTY_SECONDS_OR_MORE);
    await page.getByTestId("QuickAddComputedColumn").click();
    await getSearchListItem(page.getByTestId("FunctionSelector"), {
      dataKey: "$countAll",
    }).click();
    await page.getByTestId("QuickAddComputedColumn.Add").click();
    await page.getByTestId("LinkedColumn.Add").click();

    const linkedRecordsCount = usersTable
      .getByTestId("LinkedColumn.OpenRecords")
      .first();
    await expect(linkedRecordsCount).toHaveText("100", TWENTY_SECONDS_OR_MORE);
    await linkedRecordsCount.click();
    const linkedRecordsPopup = page.getByTestId("Popup.content").last();
    await expect(
      linkedRecordsPopup.getByTestId("Pagination.pageCountInfo"),
    ).toContainText("100 rows", TWENTY_SECONDS_OR_MORE);
    await page.getByTestId("Popup.close").last().click();

    await usersTable.getByTestId("AddChartMenu.Map").click();
    await page
      .getByTestId("AddChartMenu.Map")
      .getByRole("option")
      .filter({ hasText: "orders (delivery_address)" })
      .click();
    await test.step("Default Follow data reports missing locations for the selected row", async () => {
      const map = page.getByTestId("Window.ChildChart");
      await expect(map.getByTestId("MapExtentBehavior")).toContainText(
        "Follow data",
      );
      await page.evaluate(async () => {
        await (window as typeof window & { sql: SQLHandler }).sql(
          "UPDATE orders SET delivery_address = NULL",
        );
      });
      const selectedRow = usersTable.locator(".d-row").first();
      await selectedRow.click();
      await expect(map.locator(".MapInfoSection")).toHaveText(
        "No location data found for the selected row.",
        TWENTY_SECONDS_OR_MORE,
      );
      await selectedRow.click();
      await page.evaluate(async () => {
        await (window as typeof window & { sql: SQLHandler }).sql(
          "UPDATE orders SET delivery_address = DEFAULT",
        );
      });
    });
    await test.step("Vector basemap keeps river lines below water and ferry routes below bridge decks and station roofs", async () => {
      const { db } = await deployment.connectStateAs("admin");
      const mapWindow = await db.windows!.findOne({ type: "map" });
      if (!mapWindow) throw new Error("Expected a map window");
      const tileURL =
        "https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt";
      const tileData = createVectorBasemapFixture();
      await page.route(
        "https://vector.openstreetmap.org/shortbread_v1/**",
        (route) =>
          route.fulfill({
            contentType: "application/x-protobuf",
            body: tileData,
          }),
      );
      await db.windows!.update(
        { id: mapWindow.id },
        {
          options: {
            ...mapWindow.options,
            tileURLs: [tileURL],
            basemapOpacity: 1,
            extentBehavior: "freeRoam",
          },
        },
      );
      const canvas = page.getByTestId("Window.ChildChart").locator("canvas");
      await expect
        .poll(() =>
          canvas.evaluate((canvasElement) => {
            const deck = (canvasElement as HTMLCanvasElement)._deckgl;
            return deck?.props.layers.some(
              (layer) =>
                layer &&
                "props" in layer &&
                layer.props.id === "basemap-vector" &&
                layer.props.opacity === 1,
            );
          }),
        )
        .toBe(true);
      await canvas.evaluate((canvasElement) => {
        const deck = (canvasElement as HTMLCanvasElement)._deckgl;
        const [view] = deck?.getViews() ?? [];
        if (!deck || !view) throw new Error("Expected an initialized map");
        const longitude = (8187.5 / 2 ** 14) * 360 - 180;
        const latitude =
          (Math.atan(Math.sinh(Math.PI * (1 - (2 * 5447.5) / 2 ** 14))) * 180) /
          Math.PI;
        deck.setProps({
          /* Keep renderer fixtures independent of dashboard data updates. */
          onViewStateChange: () => {},
          onHover: () => {},
          onInteractionStateChange: ({ isZooming, inTransition }) => {
            canvasElement.setAttribute(
              "data-map-moving",
              String(!!(isZooming || inTransition)),
            );
          },
          initialViewState: { [view.id]: { longitude, latitude, zoom: 14 } },
        });
      });
      await expect
        .poll(
          () =>
            canvas.evaluate((canvasElement) => {
              const mapCanvas = canvasElement as HTMLCanvasElement;
              const viewport = mapCanvas._deckgl?.getViewports()[0];
              const image = document.createElement("canvas");
              image.width = mapCanvas.width;
              image.height = mapCanvas.height;
              const context = image.getContext("2d");
              if (!viewport || !context) return [];
              mapCanvas._deckgl?.redraw("Read vector basemap pixels");
              context.drawImage(mapCanvas, 0, 0);
              return [
                [0.3, 0.6],
                [0.5, 0.5],
                [0.52, 0.75],
              ].map(([tileX = 0, tileY = 0]) => {
                const longitude = ((8187 + tileX) / 2 ** 14) * 360 - 180;
                const latitude =
                  (Math.atan(
                    Math.sinh(Math.PI * (1 - (2 * (5447 + tileY)) / 2 ** 14)),
                  ) *
                    180) /
                  Math.PI;
                const [screenX = 0, screenY = 0] = viewport.project([
                  longitude,
                  latitude,
                ]);
                return Array.from(
                  context.getImageData(
                    Math.round((screenX * mapCanvas.width) / viewport.width),
                    Math.round((screenY * mapCanvas.height) / viewport.height),
                    1,
                    1,
                  ).data,
                ).slice(0, 3);
              });
            }),
          TWENTY_SECONDS_OR_MORE,
        )
        .toEqual([
          [139, 211, 224],
          [201, 200, 187],
          [237, 235, 219],
        ]);
      await test.step("Labels have a halo and hide duplicate places and overlapping towns at intermediate and high zoom", async () => {
        for (const zoom of [10.2, 10.5, 10.8, 11, 14, 17]) {
          await canvas.evaluate((canvasElement, zoom) => {
            const deck = (canvasElement as HTMLCanvasElement)._deckgl;
            const [view] = deck?.getViews() ?? [];
            if (!deck || !view) throw new Error("Expected an initialized map");
            const tileZoom = Math.min(Math.round(zoom), 14);
            const tileX = Math.floor(8187 / 2 ** (14 - tileZoom));
            const tileY = Math.floor(5447 / 2 ** (14 - tileZoom));
            const longitude = ((tileX + 0.5) / 2 ** tileZoom) * 360 - 180;
            const latitude =
              (Math.atan(
                Math.sinh(Math.PI * (1 - (2 * (tileY + 0.43)) / 2 ** tileZoom)),
              ) *
                180) /
              Math.PI;
            deck.setProps({
              initialViewState: { [view.id]: { longitude, latitude, zoom } },
              layers: deck.props.layers.map((layer) =>
                layer && "clone" in layer ?
                  layer.clone({ pickable: true })
                : layer,
              ),
            });
          }, zoom);
          await expect
            .poll(
              () =>
                canvas.evaluate((canvasElement) => {
                  const mapCanvas = canvasElement as HTMLCanvasElement;
                  const deck = mapCanvas._deckgl;
                  const viewport = deck?.getViewports()[0];
                  if (!deck || !viewport) return undefined;
                  deck.redraw("Check vector labels");
                  const labels = deck.pickObjects({
                    x: viewport.width / 2 - 180,
                    y: viewport.height / 2 - 80,
                    width: 360,
                    height: 160,
                    layerIds: ["basemap-vector"],
                  });
                  /* Backgrounds and glyphs both return the same feature. */
                  const visiblePlacesByLocation = new Map<string, string>();
                  for (const { object } of labels) {
                    if (object.properties.layerName === "place_labels") {
                      visiblePlacesByLocation.set(
                        JSON.stringify([
                          object.properties.name,
                          object.geometry.coordinates,
                        ]),
                        object.properties.name,
                      );
                    }
                  }
                  const image = document.createElement("canvas");
                  image.width = mapCanvas.width;
                  image.height = mapCanvas.height;
                  const context = image.getContext("2d");
                  if (!context) return undefined;
                  deck.redraw("Read label halo pixels");
                  context.drawImage(mapCanvas, 0, 0);
                  const pixels = context.getImageData(
                    Math.round(mapCanvas.width / 2 - 90),
                    Math.round(mapCanvas.height / 2 - 20),
                    180,
                    40,
                  ).data;
                  let haloPixels = 0;
                  for (let index = 0; index < pixels.length; index += 4) {
                    if (
                      (pixels[index] ?? 0) > 225 &&
                      (pixels[index + 1] ?? 0) > 225 &&
                      (pixels[index + 2] ?? 0) > 225
                    ) {
                      haloPixels++;
                    }
                  }
                  return {
                    labels: Array.from(visiblePlacesByLocation.values()),
                    hasHalo: haloPixels > 10,
                  };
                }),
              TWENTY_SECONDS_OR_MORE,
            )
            .toEqual({ labels: ["Milton Keynes"], hasHalo: true });
        }
      });
      await test.step("Labels collide across tile boundaries and stay visible after scroll zooming without panning", async () => {
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl;
          const [view] = deck?.getViews() ?? [];
          if (!deck || !view) throw new Error("Expected an initialized map");
          const longitude = (8188 / 2 ** 14) * 360 - 180;
          const latitude =
            (Math.atan(Math.sinh(Math.PI * (1 - (2 * 5447.05) / 2 ** 14))) *
              180) /
            Math.PI;
          deck.setProps({
            initialViewState: { [view.id]: { longitude, latitude, zoom: 14 } },
          });
        });
        const expectVisibleTown = async () => {
          await expect
            .poll(
              () =>
                canvas.evaluate((canvasElement) => {
                  const deck = (canvasElement as HTMLCanvasElement)._deckgl;
                  const viewport = deck?.getViewports()[0];
                  if (!deck || !viewport) return [];
                  return deck
                    .pickObjects({
                      x: viewport.width / 2 - 130,
                      y: viewport.height / 2 - 30,
                      width: 260,
                      height: 60,
                      layerIds: ["basemap-vector"],
                    })
                    .flatMap(({ object }) =>
                      object.properties.layerName === "place_labels" ?
                        [object.properties.name]
                      : [],
                    );
                }),
              TWENTY_SECONDS_OR_MORE,
            )
            .toEqual(["Welwyn Garden City"]);
        };
        await expectVisibleTown();
        await canvas.hover();
        for (const delta of [-100, 100, -60]) {
          const previousZoom = await canvas.evaluate(
            (canvasElement) =>
              (canvasElement as HTMLCanvasElement)._deckgl?.getViewports()[0]
                ?.zoom,
          );
          await page.mouse.wheel(0, delta);
          await expect
            .poll(() =>
              canvas.evaluate(
                (canvasElement) =>
                  (
                    canvasElement as HTMLCanvasElement
                  )._deckgl?.getViewports()[0]?.zoom,
              ),
            )
            .not.toBe(previousZoom);
          await expectVisibleTown();
          await expect(canvas).toHaveAttribute("data-map-moving", "false");
        }
      });
      await test.step("Street names follow road sections and omit names that do not fit", async () => {
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl;
          const [view] = deck?.getViews() ?? [];
          if (!deck || !view) throw new Error("Expected an initialized map");
          const longitude = (8187.5 / 2 ** 14) * 360 - 180;
          const latitude =
            (Math.atan(Math.sinh(Math.PI * (1 - (2 * 5447.6) / 2 ** 14))) *
              180) /
            Math.PI;
          deck.setProps({
            initialViewState: { [view.id]: { longitude, latitude, zoom: 14 } },
          });
        });
        await expect
          .poll(
            () =>
              canvas.evaluate((canvasElement) => {
                const deck = (canvasElement as HTMLCanvasElement)._deckgl;
                const viewport = deck?.getViewports()[0];
                if (!deck || !viewport) return undefined;
                const labels = deck
                  .pickObjects({
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height,
                    layerIds: ["basemap-vector"],
                  })
                  .flatMap(({ object }) =>
                    object.properties.layerName === "street_labels" ?
                      [object.properties]
                    : [],
                  );
                const station = labels.find(
                  ({ name }) => name === "Station Road",
                );
                return {
                  hasStationRoad: !!station,
                  followsDiagonal:
                    station && Math.abs(station.labelAngle - 45) < 1,
                  hasReversedStreet: labels.some(
                    ({ name }) => name === "Reversed Street",
                  ),
                  upright: labels.every(
                    ({ labelAngle }) => Math.abs(labelAngle) <= 90,
                  ),
                  hasShortName: labels.some(
                    ({ name }) => name === "Too short to fit",
                  ),
                };
              }),
            TWENTY_SECONDS_OR_MORE,
          )
          .toEqual({
            hasStationRoad: true,
            followsDiagonal: true,
            hasReversedStreet: true,
            upright: true,
            hasShortName: false,
          });
      });
      await test.step("Labels avoid collisions across data layers and the basemap, and release space when hidden or removed", async () => {
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl;
          const viewport = deck?.getViewports()[0];
          const dataLayer = deck?.props.layers.find(
            (layer) =>
              layer && "clone" in layer && layer.id !== "basemap-vector",
          );
          if (!deck || !viewport || !dataLayer || !("clone" in dataLayer))
            throw new Error("Expected an initialized map and data layer");
          const coordinates = [
            (8187.5 / 2 ** 14) * 360 - 180,
            (Math.atan(Math.sinh(Math.PI * (1 - (2 * 5447.43) / 2 ** 14))) *
              180) /
              Math.PI,
          ];
          const [x = 0, y = 0] = viewport.project(coordinates);
          const createLabelLayer = (id: string, names: string[]) =>
            (dataLayer as GeoJsonLayer).clone({
              id,
              data: {
                type: "FeatureCollection",
                features: names.map((name, index) => ({
                  type: "Feature",
                  properties: { name },
                  geometry: {
                    type: "Point",
                    coordinates:
                      index ? viewport.unproject([x, y + 70]) : coordinates,
                  },
                })),
              },
              pointType: "circle+text",
              getText: (feature) => feature.properties.name,
              getTextSize: 12,
              getTextPixelOffset: [0, 0],
              getTextAlignmentBaseline: "center",
              getPointRadius: 4,
            });
          deck.setProps({
            layers: [
              ...deck.props.layers,
              createLabelLayer("shared-label-first", ["First data layer"]),
              createLabelLayer("shared-label-second", [
                "Second data layer",
                "Separate label",
              ]),
            ],
          });
        });
        const expectSharedLabels = async (
          first: string[],
          second: string[],
          basemap: boolean,
        ) => {
          await expect
            .poll(
              () =>
                canvas.evaluate((canvasElement) => {
                  const deck = (canvasElement as HTMLCanvasElement)._deckgl;
                  const viewport = deck?.getViewports()[0];
                  if (!deck || !viewport) return undefined;
                  const getNames = (layerId: string) =>
                    deck
                      .pickObjects({
                        x: 0,
                        y: 0,
                        width: viewport.width,
                        height: viewport.height,
                        layerIds: [layerId],
                      })
                      .map(({ object }) => object.properties.name)
                      .sort();
                  const [x = 0, y = 0] = viewport.project([
                    (8187.5 / 2 ** 14) * 360 - 180,
                    (Math.atan(
                      Math.sinh(Math.PI * (1 - (2 * 5447.43) / 2 ** 14)),
                    ) *
                      180) /
                      Math.PI,
                  ]);
                  return {
                    first: getNames("shared-label-first-points-text"),
                    second: getNames("shared-label-second-points-text"),
                    basemap: deck
                      .pickObjects({
                        x: x - 90,
                        y: y - 20,
                        width: 180,
                        height: 40,
                        layerIds: ["basemap-vector"],
                      })
                      .some(
                        ({ object }) =>
                          object.properties?.name === "Milton Keynes",
                      ),
                  };
                }),
              TWENTY_SECONDS_OR_MORE,
            )
            .toEqual({ first, second, basemap });
        };
        await expectSharedLabels(
          ["First data layer"],
          ["Separate label"],
          false,
        );
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl!;
          deck.setProps({
            layers: deck.props.layers.map((layer) =>
              layer && "clone" in layer && layer.id === "shared-label-first" ?
                layer.clone({ visible: false })
              : layer,
            ),
          });
        });
        await expectSharedLabels(
          [],
          ["Second data layer", "Separate label"],
          false,
        );
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl!;
          deck.setProps({
            layers: deck.props.layers.filter(
              (layer) =>
                !layer ||
                !("id" in layer) ||
                !layer.id.startsWith("shared-label-"),
            ),
          });
        });
        await expectSharedLabels([], [], true);
      });
      await test.step("GeoJSON label collisions preserve markers, picking and wrapped text while zooming", async () => {
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl;
          const viewport = deck?.getViewports()[0];
          if (!deck || !viewport)
            throw new Error("Expected an initialized map");
          const dataLayer = deck.props.layers.find(
            (layer) =>
              layer && "clone" in layer && layer.id !== "basemap-vector",
          );
          if (!dataLayer || !("clone" in dataLayer))
            throw new Error("Expected a GeoJSON data layer");
          const centerX = viewport.width / 2;
          const centerY = viewport.height / 2;
          const features = [
            { name: "First label", x: centerX - 20, y: centerY },
            { name: "Overlapping label", x: centerX + 20, y: centerY },
            {
              name: "A long label that wraps onto several lines",
              x: centerX - 20,
              y: centerY + 80,
            },
            { name: "Under wrapped text", x: centerX - 20, y: centerY + 105 },
          ].map(({ name, x, y }) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: viewport.unproject([x, y]),
            },
            properties: { name },
          }));
          deck.setProps({
            layers: [
              (dataLayer as GeoJsonLayer).clone({
                id: "geojson-label-fixture",
                data: { type: "FeatureCollection", features },
                pointType: "circle+text",
                getText: (feature) => feature.properties.name,
                getTextSize: 12,
                getPointRadius: 4,
                getFillColor: [200, 50, 50],
                getLineColor: [200, 50, 50],
              }),
            ],
          });
        });
        const expectLabelsAndMarkers = async () => {
          await expect
            .poll(
              () =>
                canvas.evaluate((canvasElement) => {
                  const deck = (canvasElement as HTMLCanvasElement)._deckgl;
                  const viewport = deck?.getViewports()[0];
                  if (!deck || !viewport) return undefined;
                  const getNames = (pointType: "text" | "circle") =>
                    deck
                      .pickObjects({
                        x: 0,
                        y: 0,
                        width: viewport.width,
                        height: viewport.height,
                        layerIds: [`geojson-label-fixture-points-${pointType}`],
                      })
                      .map(({ object }) => object.properties.name)
                      .sort();
                  return {
                    labels: getNames("text"),
                    markers: getNames("circle"),
                  };
                }),
              TWENTY_SECONDS_OR_MORE,
            )
            .toEqual({
              labels: [
                "A long label that wraps onto several lines",
                "First label",
              ],
              markers: [
                "A long label that wraps onto several lines",
                "First label",
                "Overlapping label",
                "Under wrapped text",
              ],
            });
        };
        await expectLabelsAndMarkers();
        await canvas.hover();
        const previousZoom = await canvas.evaluate(
          (canvasElement) =>
            (canvasElement as HTMLCanvasElement)._deckgl?.getViewports()[0]
              ?.zoom,
        );
        await page.mouse.wheel(0, -60);
        await expect
          .poll(() =>
            canvas.evaluate(
              (canvasElement) =>
                (canvasElement as HTMLCanvasElement)._deckgl?.getViewports()[0]
                  ?.zoom,
            ),
          )
          .not.toBe(previousZoom);
        await expectLabelsAndMarkers();
        await expect(canvas).toHaveAttribute("data-map-moving", "false");
        await canvas.evaluate((canvasElement) => {
          const deck = (canvasElement as HTMLCanvasElement)._deckgl;
          const [view] = deck?.getViews() ?? [];
          const viewport = deck?.getViewports()[0];
          if (!deck || !view || !viewport)
            throw new Error("Expected an initialized map");
          const [longitude = 0, latitude = 0] = viewport.unproject([
            viewport.width / 2,
            viewport.height / 2,
          ]);
          deck.setProps({
            initialViewState: { [view.id]: { longitude, latitude, zoom: 16 } },
          });
        });
        await expect
          .poll(
            () =>
              canvas.evaluate((canvasElement) => {
                const deck = (canvasElement as HTMLCanvasElement)._deckgl;
                const viewport = deck?.getViewports()[0];
                if (!deck || !viewport) return [];
                return deck
                  .pickObjects({
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height,
                    layerIds: ["geojson-label-fixture-points-text"],
                  })
                  .map(({ object }) => object.properties.name)
                  .filter(
                    (name) =>
                      name === "First label" || name === "Overlapping label",
                  )
                  .sort();
              }),
            TWENTY_SECONDS_OR_MORE,
          )
          .toEqual(["First label", "Overlapping label"]);
      });
      await db.windows!.update(
        { id: mapWindow.id },
        { options: mapWindow.options },
      );
      await page.unroute("https://vector.openstreetmap.org/shortbread_v1/**");
    });
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();
    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddChartMenu.Timechart").click();
    await page
      .getByTestId("AddChartMenu.Timechart")
      .getByRole("option")
      .getByText("orders (created_at)", { exact: true })
      .click();
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();

    /** Set count all to ensure the W_TimeChart.ActiveRow below works */
    /*
    await page.getByTestId("TimeChartLayerOptions.aggFunc").click();
    await page.getByTestId("TimeChartLayerOptions.aggFunc.select").click();
    await page.getByTestId("TimeChartLayerOptions.aggFunc.select").locator(`[data-key="$countAll"]`).click();
    await page.getByTestId("Popup.close").click();
    */

    await page.waitForTimeout(5e3);
    /** Mouse move is needed to show tooltip and to trigger re-render so that _renderedData.x,y are defined */
    await page.mouse.move(700, 111);
    await page.mouse.move(700, 150);
    await page.mouse.click(700, 150);
    await page
      .getByTestId("W_TimeChart.ActiveRow")
      .waitFor({ state: "visible", timeout: 5e3 });
    /** Test W_TimeChart activeRow crossfilter */
    const {
      data = [],
      x = -99,
      y = -99,
    } = await page.evaluate(() => {
      try {
        const timeChartRef = document.querySelector(".W_TimeChart")!;
        const bbox = timeChartRef.getBoundingClientRect();
        const data = (timeChartRef as any)._renderedData as {
          x: number;
          y: number;
          value: number;
        }[];
        return { data, x: bbox.x, y: bbox.y };
      } catch (err: any) {
        document.body.innerText = err.toString() + JSON.stringify(err);
        return {};
      }
    });
    const [firstPoint, secondPoint] = data;
    if (
      typeof firstPoint?.x !== "number" ||
      typeof secondPoint?.x !== "number"
    ) {
      console.error("firstPoint or secondPoint missing:", {
        firstPoint,
        secondPoint,
      });
    } else {
      await page.mouse.click(firstPoint.x + x, firstPoint.y + y);
      await page.waitForTimeout(1e3);
      await page.mouse.click(
        firstPoint.x + x,
        firstPoint.y + y,
      ); /* to close it */
      await page.waitForTimeout(1e3);
      await page.mouse.click(secondPoint.x + x, secondPoint.y + y);
      await page.waitForTimeout(1e3);
    }

    /* Close active row */
    await page.waitForTimeout(2e3);
    const brush = await page.getByTestId("W_TimeChart.ActiveRow");
    if (await brush.isVisible()) {
      await brush.locator("button").click();
    }

    /**
     * Ensure card view works
     */
    await usersTable.getByTestId("dashboard.window.menu").click();
    await page.waitForTimeout(1e3);
    await page.getByText("Display options").click();
    await page
      .getByTestId("table.options.displayMode")
      .locator(getDataKey("card"))
      .click();
    await page.getByTestId("table.options.cardView.groupBy").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="type"]`)
      .click();
    await page.getByTestId("table.options.cardView.orderBy").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="position"]`)
      .click();
    await page.waitForTimeout(1e3);
    await page.keyboard.press("Escape");
    await usersTable.getByTestId("dashboard.window.fullscreen").click();
    await page.waitForTimeout(3e3);
    await expect(page.getByText("First Name").first()).toBeVisible();

    /** Test groupBy */
    const swapFirstTwoRows = async () => {
      const groups = page.getByTestId("CardView.group");
      await expect(groups).toHaveCount(2);
      const [firstGroup, secondGroup] = await groups.all();
      if (!firstGroup || !secondGroup) {
        throw new Error("Expected two card groups");
      }
      await page.waitForTimeout(2e3);
      const firstGroupFirstRow = await firstGroup
        .getByTestId("CardView.row")
        .first();
      const secondGroupFirstRow = await secondGroup
        .getByTestId("CardView.row")
        .first();
      const draggedText = await firstGroupFirstRow.getByTitle("id").innerText();
      const firstDragHandle = await firstGroupFirstRow.getByTestId(
        "CardView.DragHeader",
      );
      const secondDragHandle = await secondGroupFirstRow.getByTestId(
        "CardView.DragHeader",
      );

      const box1 = await firstDragHandle.boundingBox();
      const box2 = await secondDragHandle.boundingBox();
      if (!box1 || !box2) {
        throw "box1 or box2 missing";
      }
      await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, {
        steps: 22,
      });
      await firstDragHandle.hover();
      await page.waitForTimeout(1e3);
      await page.mouse.down({ button: "left" });
      await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, {
        steps: 111,
      });
      await page.mouse.up({ button: "left" });
      await page.waitForTimeout(5e3);

      const targetRowId = secondGroup
        .getByTestId("CardView.row")
        .first()
        .getByTitle("id");
      return { draggedText, targetRowId };
    };

    await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    const { draggedText, targetRowId } = await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    await expect(targetRowId).toHaveText(draggedText, { useInnerText: true });
    await page.waitForTimeout(2e3);
  } finally {
    await deployment.dispose();
  }
});
