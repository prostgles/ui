import type { DBHandlerServer, TableConfig } from "prostgles-server";
import type { DBTableHandlersFromSchema } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { TableInsertRowFromTableConfig } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import { asName } from "prostgles-types";
import type { EmailOutboxOptions } from "./EmailOutboxTypes";

export const getEmailOutboxTables = (
  options: EmailOutboxOptions,
  jobsTableName: string,
  alertDeliveriesTableName: string | undefined,
  syncUsers: boolean,
) => {
  const names = getEmailOutboxTableNames(options);
  return {
    templates: {
      info: { label: "Email templates" },
      columns: {
        key: "TEXT PRIMARY KEY CHECK (length(trim(key)) > 0)",
        subject: "TEXT NOT NULL",
        text: "TEXT NOT NULL",
        html: "TEXT NOT NULL",
        revision: "INTEGER NOT NULL DEFAULT 1",
      },
      triggers: {
        email_template_revision: {
          type: "before",
          actions: ["update"],
          forEach: "row",
          query: "BEGIN NEW.revision := OLD.revision + 1; RETURN NEW; END;",
        },
      },
      onMount: async ({ dbo }) => {
        const templates = {
          alert: {
            subject: "{{title}}",
            text: "{{body}}",
            html: "<pre>{{body}}</pre>",
          },
          ...options.templates,
        };
        await dbo[names.templates]!.insertMany(
          Object.entries(templates).map(([key, template]) => ({
            key,
            ...template,
          })),
          { onConflict: "DoNothing" },
        );
      },
    },
    outbox: {
      info: { label: "Email outbox" },
      publish: { insert: false, update: false, delete: false },
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        idempotency_key: "TEXT UNIQUE",
        user_id: syncUsers ? "UUID REFERENCES users(id)" : "UUID",
        alert_delivery_id: "UUID UNIQUE",
        job_id: `UUID REFERENCES ${asName(jobsTableName)}(id)`,
        from: 'TEXT NOT NULL CHECK (length(trim("from")) > 0)',
        to: 'TEXT NOT NULL CHECK (length(trim("to")) > 0)',
        subject: "TEXT NOT NULL",
        text: "TEXT NOT NULL",
        html: "TEXT NOT NULL",
        template_key: `TEXT REFERENCES ${asName(names.templates)}(key)`,
        template_revision: "INTEGER",
        outcome: {
          enum: ["pending", "sent", "skipped"],
          defaultValue: "pending",
        },
        reason: "TEXT",
        provider_id: "TEXT",
        sent_at: "TIMESTAMPTZ",
        created_at: "TIMESTAMPTZ NOT NULL DEFAULT now()",
      },
      constraints: {
        ...(alertDeliveriesTableName && {
          email_alert_delivery: `FOREIGN KEY (alert_delivery_id) REFERENCES ${asName(alertDeliveriesTableName)}(id)`,
        }),
      },
      indexes: { [`${names.outbox}_job`]: { columns: "job_id" } },
    },
  } as const satisfies TableConfig;
};

export const getEmailOutboxTableNames = (options: EmailOutboxOptions) => {
  const names = {
    outbox: options.tableName ?? "email_outbox",
    templates: options.templatesTableName ?? "email_templates",
  };
  for (const name of Object.values(names)) {
    if (!name || Buffer.byteLength(name) > 40 || name.includes("\0")) {
      throw new Error("Invalid email outbox table name (expected 1-40 bytes)");
    }
  }
  if (names.outbox === names.templates) {
    throw new Error("Email outbox and templates require different table names");
  }
  return names;
};

type EmailTables = ReturnType<typeof getEmailOutboxTables>;
type EmailOutboxSchema = {
  [Table in keyof EmailTables]: {
    columns: TableInsertRowFromTableConfig<EmailTables[Table]>;
  };
};

export const getEmailOutboxDb = (
  dbo: DBTableHandlersFromSchema,
  options: EmailOutboxOptions,
) => {
  const names = getEmailOutboxTableNames(options);
  return {
    outbox: dbo[names.outbox] as DBHandlerServer<EmailOutboxSchema>["outbox"],
    templates: dbo[
      names.templates
    ] as DBHandlerServer<EmailOutboxSchema>["templates"],
  };
};
