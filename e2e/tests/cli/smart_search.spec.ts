import { expect, test } from "../utils/fixtures";
import { createTestDeployment } from "../../../server/dist/server/src/cli/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { openTable, type PageWIds } from "../utils/utils";

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

test("table search filters results by the full typed value", async ({
  page: basePage,
}) => {
  test.setTimeout(180_000);
  const page = basePage as PageWIds;
  const configPath = createConfigTestProject(
    {
      id: "smart-search-e2e",
      tableConfig: {
        records: {
          columns: {
            id: "serial PRIMARY KEY",
            name: "text NOT NULL",
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
      const columns = ["name", ...testCases.map(([column]) => column)];
      const values = [
        "matching row",
        ...testCases.map(([, , value]) => value),
        "other row",
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
    await openTable(page, "records", true);

    const table = page.locator('[data-table-name="records"]');
    await table.getByTestId("dashboard.window.toggleFilterBar").click();

    for (const [column, , , , searchTerm] of testCases) {
      await table.locator("input#search-all").fill(searchTerm);
      await page.getByRole("option").filter({ hasText: column }).click();

      await expect(
        table.getByText("matching row", { exact: true }),
      ).toBeVisible();
      await expect(table.getByText("other row", { exact: true })).toHaveCount(0);

      await table
        .locator(".FilterWrapper_MinimisedRoot")
        .filter({ hasText: column })
        .getByTitle("Click to expand/collapse")
        .click();
      await table
        .locator(`[data-command="FilterWrapper"][data-key="${column}"]`)
        .getByTitle("Delete filter")
        .click();
      await expect(table.getByText("other row", { exact: true })).toBeVisible();
    }
  } finally {
    await deployment.dispose();
  }
});
