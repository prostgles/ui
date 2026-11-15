import type { DBHandlerServer, TableConfig } from "prostgles-server";
import type { DBTableHandlersFromSchema } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { TableInsertRowFromTableConfig } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import { asName, pickKeys } from "prostgles-types";
import type { AlertsOptions } from "./AlertTypes";
import { alertQuerySchema } from "./alertQuerySchema";

export const getAlertTables = (
  options: AlertsOptions,
  jobsTableName: string,
  syncUsers: boolean,
) => {
  const names = getAlertTableNames(options);
  const id = "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
  const alertReference =
    `UUID NOT NULL REFERENCES ${asName(names.alerts)}(id)` as const;
  const userReference =
    syncUsers ? "UUID NOT NULL REFERENCES users(id)" : "UUID NOT NULL";
  return {
    alerts: {
      info: { label: "Alerts" },
      columns: {
        id,
        config_key: "TEXT",
        name: "TEXT NOT NULL CHECK (length(trim(name)) > 0)",
        enabled: "BOOLEAN NOT NULL DEFAULT TRUE",
        created_by: syncUsers ? "UUID REFERENCES users(id)" : "UUID",
        user_filter: {
          nullable: false,
          jsonbSchema: { record: { values: "unknown" } },
        },
        channels: {
          nullable: false,
          jsonbSchema: {
            type: "ValueLookup[]",
            table: names.channels,
            column: "id",
            filter: { id: { $in: Object.keys(options.channels) } },
          },
        },
        /* Callback alerts use their config_key to resolve prepare from trusted config. */
        definition: {
          nullable: true,
          jsonbSchema: alertQuerySchema,
        },
        schedule: {
          nullable: false,
          jsonbSchema: { type: { cron: "string", timezone: "string" } },
        },
        revision: "INTEGER NOT NULL DEFAULT 1",
        created_at: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      constraints: {
        configured_alert: "UNIQUE(config_key)",
        alert_channels: "CHECK (jsonb_array_length(channels) > 0)",
        alert_definition:
          "CHECK (definition IS NOT NULL OR config_key IS NOT NULL)",
      },
      triggers: {
        alert_revision: {
          type: "before",
          actions: ["update"],
          forEach: "row",
          query: "BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END;",
        },
      },
      onMount: async ({ dbo }) => {
        const rules = Object.entries(options.rules ?? {});
        if (!rules.length) return;
        await dbo[names.alerts]!.insertMany(
          rules.map(([key, rule]) => ({
            config_key: key,
            name: rule.name,
            enabled: rule.enabled,
            user_filter: rule.userFilter,
            channels: rule.channels,
            schedule: rule.schedule,
            definition:
              "query" in rule ?
                pickKeys(rule, ["query", "template", "deduplicate"])
              : null,
          })),
          { onConflict: "DoNothing" },
        );
      },
    },
    deliveries: {
      info: { label: "Alert deliveries" },
      columns: {
        id,
        alert_id: alertReference,
        user_id: userReference,
        channel: "TEXT NOT NULL",
        is_test: "BOOLEAN NOT NULL DEFAULT FALSE",
        occurrence: "TIMESTAMPTZ NOT NULL",
        definition: {
          nullable: true,
          jsonbSchema: alertQuerySchema,
        },
        revision: "INTEGER NOT NULL",
        job_id: `UUID REFERENCES ${asName(jobsTableName)}(id)`,
        outcome: {
          enum: ["pending", "sent", "skipped"],
          defaultValue: "pending",
        },
        reason: "TEXT",
        provider_id: "TEXT",
        deduplication_keys: "TEXT[]",
        sent_at: "TIMESTAMPTZ",
        created_at: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      constraints: {
        occurrence: "UNIQUE(alert_id, user_id, channel, occurrence)",
      },
      indexes: {
        [`${names.deliveries}_job`]: { columns: "job_id" },
        [`${names.deliveries}_dedup`]: {
          columns: "alert_id, user_id, channel, sent_at",
          where: "deduplication_keys IS NOT NULL",
        },
      },
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
    channels: `${alertTableName}_channels`,
    deliveries: `${alertTableName}_deliveries`,
  };
};

type AlertTables = ReturnType<typeof getAlertTables>;
export type AlertSchema = {
  [Table in keyof AlertTables]: {
    columns: TableInsertRowFromTableConfig<AlertTables[Table]>;
  };
};

/* Map configurable SQL names to handlers typed from the managed table definitions. */
export const getAlertDb = (
  dbo: DBTableHandlersFromSchema,
  options: Pick<AlertsOptions, "tableName">,
) => {
  const names = getAlertTableNames(options);
  return {
    alerts: dbo[names.alerts] as DBHandlerServer<AlertSchema>["alerts"],
    deliveries: dbo[
      names.deliveries
    ] as DBHandlerServer<AlertSchema>["deliveries"],
  };
};
