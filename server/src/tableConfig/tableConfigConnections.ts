import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";

const UNIQUE_DB_COLS = ["db_name", "db_host", "db_port"] as const;
const UNIQUE_DB_FIELDLIST = UNIQUE_DB_COLS.join(", ");

export const DB_SSL_ENUM = [
  "disable",
  "allow",
  "prefer",
  "require",
  "verify-ca",
  "verify-full",
] as const;

export const tableConfigConnections: TableConfig<{ en: 1 }> = {
  connections: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      url_path: {
        sqlDefinition: `TEXT CHECK(LENGTH(url_path) > 0 AND url_path ~ '^[a-z0-9-]+$')`,
        info: {
          hint: `URL path to be used instead of the connection uuid`,
        },
      },
      user_id: `UUID REFERENCES users(id) ON DELETE CASCADE`,
      name: `TEXT NOT NULL CHECK(LENGTH(name) > 0)`,
      db_name: `TEXT NOT NULL CHECK(LENGTH(db_name) > 0)`,
      db_host: `TEXT NOT NULL DEFAULT 'localhost'`,
      db_port: `INTEGER NOT NULL DEFAULT 5432`,
      db_user: `TEXT NOT NULL DEFAULT ''`,
      db_pass: `TEXT DEFAULT ''`,
      db_connection_timeout: `INTEGER CHECK(db_connection_timeout > 0)`,
      db_schema_filter: {
        jsonbSchema: {
          oneOf: [
            { record: { values: { enum: [1] } } },
            { record: { values: { enum: [0] } } },
          ],
        },
        nullable: true,
      },
      db_ssl: { enum: DB_SSL_ENUM, nullable: false, defaultValue: "disable" },
      ssl_certificate: { sqlDefinition: `TEXT` },
      ssl_client_certificate: { sqlDefinition: `TEXT` },
      ssl_client_certificate_key: { sqlDefinition: `TEXT` },
      ssl_reject_unauthorized: {
        sqlDefinition: `BOOLEAN`,
        info: {
          hint: `If true, the server certificate is verified against the list of supplied CAs. \nAn error event is emitted if verification fails`,
        },
      },
      db_conn: { sqlDefinition: `TEXT DEFAULT ''` },
      db_watch_shema: { sqlDefinition: `BOOLEAN DEFAULT TRUE` },
      disable_realtime: {
        sqlDefinition: `BOOLEAN DEFAULT FALSE`,
        info: {
          hint: `If true then subscriptions and syncs will not work. Used to ensure prostgles schema is not created and nothing is changed in the database`,
        },
      },
      prgl_url: { sqlDefinition: `TEXT` },
      prgl_params: { sqlDefinition: `JSONB` },
      type: {
        enum: ["Standard", "Connection URI", "Prostgles"],
        nullable: false,
      },
      is_state_db: {
        sqlDefinition: `BOOLEAN`,
        info: { hint: `If true then this DB is used to run the dashboard` },
      },
      on_mount_ts: {
        sqlDefinition: "TEXT",
        info: {
          hint: `On mount typescript function. Must export const onMount`,
        },
      },
      on_mount_ts_disabled: {
        sqlDefinition: "BOOLEAN",
        info: { hint: `If true then On mount typescript will not be executed` },
      },
      info: {
        jsonbSchemaType: {
          canCreateDb: {
            type: "boolean",
            optional: true,
            description:
              "True if postgres user is allowed to create databases. Never gets updated",
          },
        },
        nullable: true,
      },
      table_options: {
        nullable: true,
        jsonbSchema: {
          record: {
            partial: true,
            values: {
              type: {
                icon: { type: "string", optional: true },
              },
            },
          },
        },
      },
      config: {
        jsonbSchemaType: { enabled: "boolean", path: "string" },
        nullable: true,
      },
      created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
      last_updated: { sqlDefinition: `BIGINT NOT NULL DEFAULT 0` },
    },
    constraints: {
      unique_connection_url_path: `UNIQUE(url_path)`,
      uniqueConName: `UNIQUE(name, user_id)`,
      "Check connection type": `CHECK (
            type IN ('Standard', 'Connection URI', 'Prostgles') 
            AND (type <> 'Connection URI' OR length(db_conn) > 1) 
            AND (type <> 'Standard' OR length(db_host) > 1) 
            AND (type <> 'Prostgles' OR length(prgl_url) > 0)
          )`,
      database_config_fkey: `FOREIGN KEY (${UNIQUE_DB_FIELDLIST}) REFERENCES database_configs( ${UNIQUE_DB_FIELDLIST} )`,
    },
  },
};
