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
    ],
    sort: [{ key: "created_at", asc: false }],
    referenceDisplay: { columns: [{ name: "name" }] },
    card: {
      headerColumn: "name",
    },
    columns: {
      name: { width: 220, infoLevel: 1 },
      enabled: { infoLevel: 1 },
      user_filter: {
        label: "Users filter",
        infoLevel: 1,
        defaultRenderAs: getAlertColumnFormat("user_filter"),
      },
      channels: {
        infoLevel: 1,
        defaultRenderAs: getAlertColumnFormat("channels"),
      },
      definition: {
        label: "Rule",
        width: 320,
        infoLevel: 1,
        defaultRenderAs: getAlertColumnFormat("definition"),
      },
      schedule: {
        width: 220,
        infoLevel: 1,
        defaultRenderAs: getAlertColumnFormat("schedule"),
      },
      id: { infoLevel: 2 },
      config_key: { label: "Config key", infoLevel: 2 },
      created_by: { infoLevel: 2 },
      revision: { infoLevel: 2 },
      created_at: { renderAs: { type: "Age" }, infoLevel: 2 },
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
    ],
    sort: [{ key: "occurrence", asc: false }],
    card: {
      headerColumn: "outcome",
      subHeaderColumn: "user_id",
    },
    columns: {
      alert_id: { label: "Alert", infoLevel: 1 },
      occurrence: { infoLevel: 1 },
      channel: { infoLevel: 1 },
      is_test: { label: "Test delivery", infoLevel: 1 },
      reason: { infoLevel: 1 },
      id: { infoLevel: 2 },
      revision: { infoLevel: 2 },
      provider_id: { infoLevel: 2 },
      deduplication_keys: { label: "Deduplication keys", infoLevel: 2 },
      sent_at: { renderAs: { type: "Age" }, infoLevel: 2 },
      user_id: { label: "Recipient", infoLevel: 1 },
      job_id: { label: "Delivery job", infoLevel: 2 },
      definition: {
        label: "Rule snapshot",
        width: 320,
        infoLevel: 2,
        defaultRenderAs: getAlertColumnFormat("definition"),
      },
      created_at: { renderAs: { type: "Age" }, infoLevel: 2 },
      outcome: {
        infoLevel: 1,
        style: {
          type: "Conditional",
          conditions: [
            { operator: "=", condition: "pending", textColor: "#946200" },
            { operator: "=", condition: "sent", textColor: "#16803c" },
            { operator: "=", condition: "skipped", textColor: "#666666" },
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
