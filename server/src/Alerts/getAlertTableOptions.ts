import type {
  AlertFieldName,
  InternalColumnFormat,
  TableOptions,
} from "@common/managedTableSchema";
import type { getAlertTableNames } from "./getAlertTables";

export const getAlertTableOptions = (
  names: ReturnType<typeof getAlertTableNames>,
): Record<string, Partial<TableOptions>> => ({
  [names.alerts]: {
    managedTableType: "alerts",
    icon: "BellOutline",
    defaultColumns: [
      "name",
      "enabled",
      "user_filter",
      "channels",
      "definition",
      "schedule",
      "actions",
    ],
    sort: [{ key: "created_at", asc: false }],
    referenceDisplay: { columns: [{ name: "name" }] },
    card: {
      headerColumn: "name",
      summaryFields: [
        "enabled",
        "user_filter",
        "channels",
        "definition",
        "schedule",
        "actions",
      ],
      layoutSections: [
        { items: ["id", "config_key", "created_by", "revision", "created_at"] },
      ],
    },
    columns: {
      actions: {
        label: "Actions",
        format: {
          type: "ActionColumns",
          params: {
            actions: [
              { methodName: "previewAlert" },
              { methodName: "sendTestAlert" },
            ],
          },
        },
      },
      name: { width: 220 },
      enabled: {
        style: {
          type: "Conditional",
          defaultStyle: {
            chipColor: "var(--light-gray)",
            textColor: "var(--gray)",
          },
          conditions: [
            {
              operator: "=",
              condition: true,
              chipColor: "var(--light-green)",
              textColor: "var(--green)",
            },
          ],
        },
      },
      user_filter: {
        label: "Recipients",
        defaultRenderAs: getAlertColumnFormat("user_filter"),
      },
      channels: {
        defaultRenderAs: getAlertColumnFormat("channels"),
      },
      definition: {
        label: "Rule",
        width: 320,
        defaultRenderAs: getAlertColumnFormat("definition"),
      },
      schedule: {
        width: 220,
        defaultRenderAs: getAlertColumnFormat("schedule"),
      },
      config_key: { label: "Config key" },
      created_at: { renderAs: { type: "Age" } },
    },
  },
  [names.deliveries]: {
    managedTableType: "alert-deliveries",
    icon: "BellCheckOutline",
    defaultColumns: [
      "occurrence",
      "alert_id",
      "user_id",
      "channel",
      "outcome",
      "is_test",
      "reason",
      "job_id",
    ],
    sort: [{ key: "occurrence", asc: false }],
    card: {
      headerColumn: "outcome",
      subHeaderColumn: "user_id",
      summaryFields: [
        "alert_id",
        "occurrence",
        "channel",
        "is_test",
        "reason",
        "job_id",
      ],
      layoutSections: [
        {
          items: [
            "id",
            "revision",
            "provider_id",
            "deduplication_keys",
            "sent_at",
            "definition",
            "created_at",
          ],
        },
      ],
    },
    columns: {
      alert_id: { label: "Alert" },
      is_test: { label: "Test delivery" },
      deduplication_keys: { label: "Deduplication keys" },
      sent_at: { renderAs: { type: "Age" } },
      user_id: { label: "Recipient" },
      job_id: { label: "Delivery job" },
      definition: {
        label: "Rule snapshot",
        width: 320,
        defaultRenderAs: getAlertColumnFormat("definition"),
      },
      created_at: { renderAs: { type: "Age" } },
      outcome: {
        style: {
          type: "Conditional",
          conditions: [
            {
              operator: "=",
              condition: "pending",
              textColor: "var(--yellow)",
            },
            { operator: "=", condition: "sent", textColor: "var(--green)" },
            { operator: "=", condition: "skipped", textColor: "var(--gray)" },
          ],
        },
      },
    },
  },
});

const getAlertColumnFormat = (field: AlertFieldName): InternalColumnFormat => ({
  type: "Internal",
  params: { component: "Alert", field },
});
