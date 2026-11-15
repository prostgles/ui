import { expect, test } from "../utils/fixtures";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { openTable } from "../utils/utils";

const testCases = [
  ["text_value", "text", "text match", "other text", "text mat"],
  [
    "uuid_value",
    "uuid",
    "a636fde3-6d93-407d-8e60-3054332abcde",
    "b7470ef4-7a4f-45e8-b9a8-93c438c61896",
    "a636fde3",
  ],
  ["integer_value", "integer", 234567, 765432, "234567"],
  ["bigint_value", "bigint", "9876543210123", "1234567890123", "987654"],
  ["numeric_value", "numeric", "4567.89", "9876.54", "4567.89"],
  ["boolean_value", "boolean", true, false, "true"],
  ["date_value", "date", "2041-02-03", "2051-02-03", "2041-02"],
  [
    "timestamp_value",
    "timestamp",
    "2042-03-04 05:06:07",
    "2052-03-04 05:06:07",
    "2042-03",
  ],
  [
    "timestamptz_value",
    "timestamptz",
    "2043-04-05 06:07:08+00",
    "2053-04-05 06:07:08+00",
    "2043-04",
  ],
  [
    "jsonb_value",
    "jsonb",
    { value: "json match" },
    { value: "other json" },
    "json mat",
  ],
  [
    "text_array",
    "text[]",
    ["text array match", "second value"],
    ["other text array"],
    "array mat",
  ],
  ["integer_array", "integer[]", [345678, 456789], [765432], "345678"],
] as const;

test("IN filters show column labels, report timeouts and recover on a new search", async ({
  page,
}) => {
  const configPath = createConfigTestProject(
    {
      id: "view-filter-e2e",
      connection: {
        table_options: {
          journeys: {
            columns: {
              origin: { label: "From" },
              destination: { label: "To" },
            },
          },
        },
      },
      onInitSQL: `
        CREATE TABLE locations (id int PRIMARY KEY, name text NOT NULL);
        INSERT INTO locations VALUES
          (1, 'Tottenham Hale'), (2, 'London Liverpool Street'), (3, 'York');
        CREATE VIEW journeys AS
          SELECT origin.name AS origin, destination.name AS destination
          FROM locations origin CROSS JOIN locations destination
          WHERE (origin.id = 1 AND destination.id = 2)
             OR (origin.id = 2 AND destination.id = 3);
      `,
    },
    test.info().outputPath("config"),
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: "view-filter-e2e",
    logPath: test.info().outputPath("view-filter-server.log"),
  });
  const timeoutMessage = "canceling statement due to statement timeout";
  await page.routeWebSocket("**", (socket) => {
    const server = socket.connectToServer();
    socket.onMessage((message) => {
      if (typeof message === "string" && message.startsWith("42")) {
        const payloadStart = message.indexOf("[");
        const [, request] = JSON.parse(message.slice(payloadStart));
        if (
          request?.tableName === "journeys" &&
          request.command === "find" &&
          request.param2?.returnType === "values" &&
          JSON.stringify(request.param1).includes("%timeout%")
        ) {
          const acknowledgementId = message.slice(2, payloadStart);
          socket.send(
            `43${acknowledgementId}${JSON.stringify([{ message: timeoutMessage, code: "57014" }, null])}`,
          );
          return;
        }
      }
      server.send(message);
    });
  });
  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "journeys", true);
    const table = page.locator('[data-table-name="journeys"]');
    await expect(table.getByTestId("TableBody").getByRole("row")).toHaveCount(
      2,
    );
    await table.getByTestId("dashboard.window.toggleFilterBar").click();
    await table
      .getByRole("button", { name: "Add filter", exact: true })
      .click();
    const popup = page.getByTestId("SmartAddFilter").filter({
      has: page.getByTestId("SmartAddFilter.toggleIncludeLinkedColumns"),
    });
    await expect(
      popup.getByRole("option").filter({ hasText: /^From/ }),
    ).toBeVisible();
    await expect(
      popup.getByRole("option").filter({ hasText: /^To/ }),
    ).toBeVisible();
    await popup.getByRole("option").filter({ hasText: /^From/ }).click();
    const filter = table.getByTestId("FilterWrapper");
    /* A failed suggestion query must report its error without inventing NULL options. */
    await filter.getByTestId("SearchList.Input").fill("timeout");
    const alert = page.getByTestId("Alert");
    await expect(alert).toContainText("Could not load filter options");
    await expect(alert).toContainText(timeoutMessage);
    await alert.getByRole("button", { name: "OK", exact: true }).click();
    await expect(filter.getByTestId("ErrorComponent")).toContainText(
      timeoutMessage,
    );
    await expect(filter.getByRole("option")).toHaveCount(0);
    await filter.getByTestId("SearchList.Input").fill("tot");
    await filter
      .getByRole("option")
      .filter({ hasText: "Tottenham Hale" })
      .click();
    await expect(filter.getByTestId("ErrorComponent")).toHaveCount(0);
    await expect(table.getByTestId("TableBody").getByRole("row")).toHaveCount(
      1,
    );
    await expect(table.getByTestId("TableBody")).toContainText(
      "Tottenham Hale",
    );
    await expect(table.getByTestId("TableBody")).toContainText(
      "London Liverpool Street",
    );
  } finally {
    await deployment.dispose();
  }
});

test("table search ranks labeled results and filters by the full typed value", async ({
  page: basePage,
}) => {
  test.setTimeout(180_000);
  const page = basePage;
  const configPath = createConfigTestProject(
    {
      id: "smart-search-e2e",
      connection: {
        table_options: {
          records: {
            label: "Documents",
            columns: { status: { label: "Workflow state" } },
          },
          records_archive: { label: "Records archive" },
        },
      },
      tableConfig: {
        records_archive: { columns: { id: "serial PRIMARY KEY" } },
        records: {
          columns: {
            id: "serial PRIMARY KEY",
            name: "text NOT NULL",
            description: "text",
            status: "text",
            ...Object.fromEntries(
              testCases.map(([column, dataType]) => [column, dataType]),
            ),
          },
        },
      },
    },
    test.info().outputPath("config"),
  );
  const deployment = await createTestDeployment({
    configPath,
    configId: "smart-search-e2e",
    logPath: test.info().outputPath("smart-search-server.log"),
    seed: async ({ projectDatabase }) => {
      const columns = [
        "name",
        "description",
        "status",
        ...testCases.map(([column]) => column),
      ];
      const values = [
        "matching row",
        "From an opening",
        "pending",
        ...testCases.map(([, , value]) => value),
        "other row",
        "open",
        "pen",
        ...testCases.map(([, , , otherValue]) => otherValue),
      ];
      const placeholders = (offset: number) =>
        columns.map((_, index) => `$${offset + index + 1}`).join(", ");
      await projectDatabase.query(
        `INSERT INTO records (${columns.join(", ")}) VALUES (${placeholders(0)}), (${placeholders(columns.length)})`,
        values,
      );
    },
  });

  try {
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    /* Raw table names take precedence over competing labels in the helper. */
    await openTable(page, "records", true);
    await expect(
      page.locator('[data-table-name="records_archive"]'),
    ).toHaveCount(0);

    const table = page.locator('[data-table-name="records"]');
    const search = table.locator("input#search-all");
    const searchResults = table
      .getByTestId("SearchList")
      .filter({ has: page.locator("input#search-all") })
      .getByTestId("SearchList.List");
    await table.getByTestId("dashboard.window.toggleFilterBar").click();

    /* Later columns must outrank earlier substring matches, ignoring case. */
    await search.fill("PEN");
    await expect(searchResults.getByRole("option")).toHaveText([
      /^Workflow state:\s*pen$/,
      /^Workflow state:\s*pending$/,
      /^Description:\s*open$/,
      /^Description:\s*From an opening$/,
    ]);

    for (const [column, , , , searchTerm] of testCases) {
      await search.fill(searchTerm);
      await searchResults
        .getByRole("option", {
          name: new RegExp(`^${column.replaceAll("_", " ")}:`, "i"),
        })
        .filter({ hasText: searchTerm })
        .click();

      await expect(
        table.getByText("matching row", { exact: true }),
      ).toBeVisible();
      await expect(table.getByText("other row", { exact: true })).toHaveCount(
        0,
      );

      await table.locator(".FilterWrapper_MinimisedRoot").click();
      await table
        .locator(`[data-command="FilterWrapper"][data-key="${column}"]`)
        .getByTitle("Delete filter")
        .click();
      await expect(table.getByText("other row", { exact: true })).toBeVisible();
    }

    /* Both W_Table search layouts use the displayed column configuration. */
    const state = await deployment.connectStateAs("admin");
    try {
      const tableWindow = await state.db.windows!.findOne({
        table_name: "records",
      });
      if (!tableWindow?.workspace_id) {
        throw new Error("Expected the records window to belong to a workspace");
      }
      await expect
        .poll(async () => {
          const savedWindow = await state.db.windows!.findOne({
            id: tableWindow.id,
          });
          return savedWindow?.filter;
        })
        .toEqual([]);
      await state.db.windows!.update(
        { id: tableWindow.id },
        { columns: [{ name: "name", label: "Record name", show: true }] },
      );
      await expect(
        table.locator(".table-column-label").filter({ hasText: /\S/ }),
      ).toHaveText(["Record name"]);
      for (const layout_mode of ["editable", "fixed"] as const) {
        await state.db.workspaces!.update(
          { id: tableWindow.workspace_id },
          { layout_mode },
        );
        await expect(
          table.locator(".silver-grid-item-header--icon input#search-all"),
        ).toHaveCount(layout_mode === "fixed" ? 1 : 0);
        await search.fill("text match");
        await expect(searchResults).toContainText("No results");
        await search.press("Enter");
        await expect(
          table.getByTestId("TableBody").getByRole("row"),
        ).toHaveCount(0);
        await table.locator(".FilterWrapper_MinimisedRoot").click();
        await table.getByTestId("FilterWrapper.deleteFilter").click();
        await search.fill("matching row");
        await expect(searchResults.getByRole("option")).toContainText(
          "Record name:",
        );
        await searchResults.getByRole("option").click();
        await expect(
          table.getByText("matching row", { exact: true }),
        ).toBeVisible();
        await expect(table.getByText("other row", { exact: true })).toHaveCount(
          0,
        );
        await table.locator(".FilterWrapper_MinimisedRoot").click();
        await table.getByTestId("FilterWrapper.deleteFilter").click();
        await expect(
          table.getByText("other row", { exact: true }),
        ).toBeVisible();
      }
      /* Prefix selection also uses the raw table name. */
      await openTable(page, "records_ar");
    } finally {
      state.disconnect();
    }
  } finally {
    await deployment.dispose();
  }
});
