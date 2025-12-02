import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

export const DUMP_OPTIONS_SCHEMA = {
  jsonbSchema: {
    oneOfType: [
      {
        command: { enum: ["pg_dumpall"] },
        clean: { type: "boolean" },
        dataOnly: { type: "boolean", optional: true },
        globalsOnly: { type: "boolean", optional: true },
        rolesOnly: { type: "boolean", optional: true },
        schemaOnly: { type: "boolean", optional: true },
        ifExists: { type: "boolean", optional: true },
        encoding: { type: "string", optional: true },
        keepLogs: { type: "boolean", optional: true },
      },
      {
        command: { enum: ["pg_dump"] },
        format: { enum: ["p", "t", "c"] },
        dataOnly: { type: "boolean", optional: true },
        clean: { type: "boolean", optional: true },
        create: { type: "boolean", optional: true },
        encoding: { type: "string", optional: true },
        numberOfJobs: { type: "integer", optional: true },
        noOwner: { type: "boolean", optional: true },

        compressionLevel: { type: "integer", optional: true },
        ifExists: { type: "boolean", optional: true },

        keepLogs: { type: "boolean", optional: true },
        excludeSchema: { type: "string", optional: true },
        schemaOnly: { type: "boolean", optional: true },
      },
    ],
  },
} as const;

export const tableConfigBackups: TableConfig<{ en: 1 }> = {
  backups: {
    columns: {
      id: {
        sqlDefinition: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`,
        info: { hint: "Format: dbname_datetime_uuid" },
      },
      name: {
        sqlDefinition: `TEXT UNIQUE`,
        info: { hint: "Name of the backup" },
      },
      connection_id: {
        sqlDefinition: `UUID REFERENCES connections(id) ON DELETE SET NULL`,
        info: { hint: "If null then connection was deleted" },
      },
      connection_details: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'unknown connection' `,
      },
      credential_id: {
        sqlDefinition: `INTEGER REFERENCES credentials(id) `,
        info: { hint: "If null then uploaded locally" },
      },
      destination: {
        enum: ["Local", "Cloud", "None (temp stream)"],
        nullable: false,
      },
      dump_command: { sqlDefinition: `TEXT NOT NULL` },
      restore_command: { sqlDefinition: `TEXT` },
      local_filepath: { sqlDefinition: `TEXT` },
      content_type: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'application/gzip'`,
      },
      initiator: { sqlDefinition: `TEXT` },
      details: { sqlDefinition: `JSONB` },
      status: {
        jsonbSchema: {
          oneOfType: [
            { ok: { type: "string" } },
            { err: { type: "string" } },
            // { cancelled: { type: "number" } },
            {
              loading: {
                optional: true,
                type: {
                  loaded: { type: "number" },
                  total: { type: "number", optional: true },
                },
              },
            },
          ],
        },
      },
      uploaded: { sqlDefinition: `TIMESTAMPTZ` },
      restore_status: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            { ok: { type: "string" } },
            { err: { type: "string" } },
            {
              loading: {
                type: {
                  loaded: { type: "number" },
                  total: { type: "number" },
                },
              },
            },
          ],
        },
      },
      restore_start: { sqlDefinition: `TIMESTAMPTZ` },
      restore_end: { sqlDefinition: `TIMESTAMPTZ` },
      restore_logs: { sqlDefinition: `TEXT` },
      dump_logs: { sqlDefinition: `TEXT` },
      dbSizeInBytes: {
        sqlDefinition: `BIGINT NOT NULL`,
        label: "Database size on disk",
      },
      sizeInBytes: { sqlDefinition: `BIGINT`, label: "Backup file size" },
      created: { sqlDefinition: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` },
      last_updated: { sqlDefinition: `TIMESTAMPTZ NOT NULL DEFAULT NOW()` },
      options: DUMP_OPTIONS_SCHEMA,
      restore_options: {
        jsonbSchemaType: {
          command: { enum: ["pg_restore", "psql"] },
          format: { enum: ["p", "t", "c"] },
          clean: { type: "boolean" },
          excludeSchema: { type: "string", optional: true },
          newDbName: { type: "string", optional: true },
          create: { type: "boolean", optional: true },
          dataOnly: { type: "boolean", optional: true },
          noOwner: { type: "boolean", optional: true },
          numberOfJobs: { type: "integer", optional: true },

          ifExists: { type: "boolean", optional: true },

          keepLogs: { type: "boolean", optional: true },
        },
        defaultValue: `{ "clean": true, "format": "c", "command": "pg_restore" }`,
      },
    },
  },
};
