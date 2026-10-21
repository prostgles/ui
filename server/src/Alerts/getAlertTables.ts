import { asName } from "prostgles-types";
import type { DBTableHandlersFromSchema } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { TableConfig, DBHandlerServer } from "prostgles-server";
import type { TableInsertRowFromTableConfig } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import type { AlertsOptions } from "./AlertTypes";

export const getAlertTables = (
  options: AlertsOptions,
  jobsTableName: string,
) => {
  const names = getAlertTableNames(options);
  const id = "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
  const alertReference =
    `UUID NOT NULL REFERENCES ${asName(names.alerts)}(id)` as const;
  return {
    alerts: {
      info: { label: "Alerts" },
      columns: {
        id,
        name: "TEXT NOT NULL CHECK (length(trim(name)) > 0)",
        enabled: "BOOLEAN NOT NULL DEFAULT TRUE",
        created_by: "TEXT NOT NULL",
        definition: {
          nullable: false,
          jsonbSchema: {
            oneOfType: Object.entries(options.types).map(
              ([name, definition]) => ({
                type: { enum: [name] },
                params: { type: definition.params },
              }),
            ),
          },
        },
        schedule: {
          nullable: false,
          jsonbSchema: { type: { cron: "string", timezone: "string" } },
        },
        revision: "INTEGER NOT NULL DEFAULT 1",
        created_at: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      triggers: {
        alert_revision: {
          type: "before",
          actions: ["update"],
          forEach: "row",
          query: "BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END;",
        },
      },
    },
    recipients: {
      info: { label: "Alert recipients" },
      columns: {
        id,
        alert_id: alertReference,
        user_id: "TEXT NOT NULL",
        channel: { enum: Object.keys(options.channels), nullable: false },
        enabled: "BOOLEAN NOT NULL DEFAULT TRUE",
      },
      constraints: { recipient: "UNIQUE(alert_id, user_id, channel)" },
    },
    deliveries: {
      info: { label: "Alert deliveries" },
      columns: {
        id,
        alert_id: alertReference,
        recipient_id: `UUID NOT NULL REFERENCES ${asName(names.recipients)}(id)`,
        user_id: "TEXT NOT NULL",
        channel: "TEXT NOT NULL",
        occurrence: "TIMESTAMPTZ NOT NULL",
        // Historical definitions remain readable when a type changes or is removed.
        definition: {
          nullable: false,
          jsonbSchema: {
            type: { type: "string", params: { record: { values: "unknown" } } },
          },
        },
        revision: "INTEGER NOT NULL",
        job_id: `UUID REFERENCES ${asName(jobsTableName)}(id)`,
        outcome: {
          enum: ["pending", "sent", "skipped"],
          defaultValue: "pending",
        },
        reason: "TEXT",
        provider_id: "TEXT",
        created_at: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      constraints: { occurrence: "UNIQUE(alert_id, recipient_id, occurrence)" },
      indexes: { [`${names.deliveries}_job`]: { columns: "job_id" } },
    },
  } as const satisfies TableConfig;
};

export const getAlertTableNames = (
  options: Pick<AlertsOptions, "tableName">,
) => {
  const alertTableName = options.tableName ?? "alerts";
  if (
    !alertTableName ||
    Buffer.byteLength(alertTableName) > 40 ||
    alertTableName.includes("\0")
  ) {
    throw new Error("Invalid alerts.tableName (expected 1-40 bytes)");
  }
  return {
    alerts: alertTableName,
    recipients: `${alertTableName}_recipients`,
    deliveries: `${alertTableName}_deliveries`,
  };
};

type AlertTables = ReturnType<typeof getAlertTables>;
export type AlertSchema = {
  [Table in keyof AlertTables]: {
    columns: TableInsertRowFromTableConfig<AlertTables[Table]>;
  };
};

// Map configurable SQL names to handlers typed from the managed table definitions.
export const getAlertDb = (
  dbo: DBTableHandlersFromSchema,
  options: AlertsOptions,
) => {
  const names = getAlertTableNames(options);
  return {
    alerts: dbo[names.alerts] as DBHandlerServer<AlertSchema>["alerts"],
    recipients: dbo[
      names.recipients
    ] as DBHandlerServer<AlertSchema>["recipients"],
    deliveries: dbo[
      names.deliveries
    ] as DBHandlerServer<AlertSchema>["deliveries"],
  };
};
