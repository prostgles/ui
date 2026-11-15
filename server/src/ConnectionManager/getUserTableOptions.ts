import type { TableOptions } from "@common/managedTableSchema";

export const getUserTableOptions = (
  includeSessionStats: boolean,
): Partial<TableOptions> => ({
  label: "Users",
  icon: "Account",
  card: {
    headerColumn: "username",
    subHeaderColumns: ["name", "status"],
    summaryFields: [
      "email",
      "type",
      "created",
      "registration",
      ...(includeSessionStats ? ["last_logged_in"] : []),
    ],
    layoutSections: [{ items: ["id", "has_2fa_enabled"] }],
  },
  referenceDisplay: {
    columns: [{ name: "username", format: { type: "Avatar" } }],
  },
  columns: {
    type: { label: "Role" },
    created: {
      label: "Created",
      renderAs: {
        type: "Age",
        params: { variant: "short", showTimestamp: true },
      },
    },
    status: {
      style: {
        type: "Conditional",
        defaultStyle: {
          chipColor: "var(--light-gray)",
          textColor: "var(--gray)",
        },
        conditions: [
          {
            operator: "=",
            condition: "active",
            chipColor: "var(--light-green)",
            textColor: "var(--green)",
          },
          {
            operator: "=",
            condition: "pending",
            chipColor: "var(--light-yellow)",
            textColor: "var(--yellow)",
          },
          {
            operator: "=",
            condition: "disabled",
            chipColor: "var(--light-red)",
            textColor: "var(--red)",
          },
        ],
      },
    },
    registration: {
      renderAs: { type: "JSON Summary", params: { path: ["type"] } },
    },
    has_2fa_enabled: { label: "Two-factor authentication" },
    last_updated: { show: false },
    options: { show: false },
    ...(includeSessionStats && {
      last_logged_in: {
        label: "Last logged in",
        nested: {
          path: [{ table: "sessions", on: [{ id: "user_id" }] }],
          detailedFilter: [{ fieldName: "type", type: "$eq", value: "web" }],
          columns: [
            {
              name: "created",
              show: true,
              format: {
                type: "Age",
                params: { variant: "short", showTimestamp: true },
              },
            },
          ],
          sort: { key: "created", asc: false, nulls: "last" },
          limit: 1,
          display: { type: "values", labels: "none" },
        },
      },
    }),
  },
});
