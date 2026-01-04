import { CONNECTION_CONFIG_SECTIONS } from "@common/utils";
import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { loggerTableConfig } from "../Logger";
import { tableConfigAccessControl } from "./tableConfigAccessControl";
import { DUMP_OPTIONS_SCHEMA, tableConfigBackups } from "./tableConfigBackups";
import { tableConfigConnections } from "./tableConfigConnections";
import { tableConfigGlobalSettings } from "./tableConfigGlobalSettings";
import { tableConfigLinks } from "./tableConfigLinks";
import { tableConfigLLM } from "./tableConfigLlm/tableConfigLlm";
import { tableConfigMCPServers } from "./tableConfigMCPServers";
import { tableConfigPublishedMethods } from "./tableConfigPublishedMethods";
import { tableConfigUsers } from "./tableConfigUsers";
import { tableConfigWindows } from "./tableConfigWindows";
import { tableConfigWorkspaces } from "./tableConfigWorkspaces";

export const UNIQUE_DB_COLS = ["db_name", "db_host", "db_port"] as const;
const UNIQUE_DB_FIELDLIST = UNIQUE_DB_COLS.join(", ");

const tableConfigSchema: JSONB.JSONBSchema = {
  record: {
    values: {
      oneOfType: [
        {
          isLookupTable: {
            type: {
              values: {
                record: { values: { type: "string", optional: true } },
              },
            },
          },
        },
        {
          columns: {
            description: "Column definitions and hints",
            record: {
              values: {
                oneOf: [
                  "string",
                  {
                    type: {
                      hint: { type: "string", optional: true },
                      nullable: { type: "boolean", optional: true },
                      isText: { type: "boolean", optional: true },
                      trimmed: { type: "boolean", optional: true },
                      defaultValue: { type: "any", optional: true },
                    },
                  },
                  {
                    type: {
                      jsonbSchema: {
                        oneOfType: [
                          {
                            type: {
                              enum: [
                                "string",
                                "number",
                                "boolean",
                                "Date",
                                "time",
                                "timestamp",
                                "string[]",
                                "number[]",
                                "boolean[]",
                                "Date[]",
                                "time[]",
                                "timestamp[]",
                              ],
                            },
                            optional: { type: "boolean", optional: true },
                            description: { type: "string", optional: true },
                          },
                          {
                            type: {
                              enum: ["Lookup", "Lookup[]"],
                            },
                            optional: { type: "boolean", optional: true },
                            description: { type: "string", optional: true },
                          },
                          {
                            type: {
                              enum: ["object"],
                            },
                            optional: { type: "boolean", optional: true },
                            description: { type: "string", optional: true },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

const SESSION_TYPE = {
  enum: ["web", "api_token", "mobile"],
  defaultValue: "web",
  nullable: false,
} as const;

export const tableConfig: TableConfig<{ en: 1 }> = {
  user_types: {
    isLookupTable: {
      values: {
        admin: {
          description: "Highest access level",
        },
        public: {
          description:
            "Public user. Account created on login and deleted on logout",
        },
        default: {},
      },
    },
    triggers: {
      atLeastOneAdminAndPublic: {
        actions: ["delete", "update"],
        type: "after",
        forEach: "statement",
        query: ` 
          BEGIN
            IF NOT EXISTS(SELECT * FROM user_types WHERE id = 'admin') 
              OR NOT EXISTS(SELECT * FROM user_types WHERE id = 'public')
            THEN
              RAISE EXCEPTION 'admin and public user types cannot be deleted/modified';
            END IF;
  
            RETURN NULL;
          END;
        `,
      },
    },
  },
  user_statuses: {
    isLookupTable: {
      values: { active: {}, disabled: {}, public: {} },
    },
  },

  ...tableConfigUsers,

  session_types: {
    isLookupTable: {
      values: { web: {}, api_token: {}, mobile: {} },
    },
  },

  sessions: {
    columns: {
      id: `TEXT UNIQUE NOT NULL`,
      id_num: `SERIAL PRIMARY KEY`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      name: `TEXT`,
      socket_id: `TEXT`,
      user_type: `TEXT NOT NULL`,
      is_mobile: `BOOLEAN DEFAULT FALSE`,
      is_connected: `BOOLEAN DEFAULT FALSE`,
      active: `BOOLEAN DEFAULT TRUE`,
      project_id: `TEXT`,
      ip_address: `INET NOT NULL`,
      type: `TEXT NOT NULL REFERENCES session_types`,
      user_agent: "TEXT",
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      last_used: `TIMESTAMPTZ DEFAULT NOW()`,
      expires: `BIGINT NOT NULL`,
    },
  },

  services: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      label: `TEXT NOT NULL UNIQUE`,
      description: `TEXT`,
      icon: `TEXT NOT NULL`,
      default_port: `INTEGER NOT NULL`,
      build_hash: `TEXT`,
      status: {
        enum: [
          "stopped",
          "starting",
          "running",
          "error",
          "building",
          "building-done",
          "build-error",
        ],
      },
      configs: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: {
              type: {
                label: "string",
                description: "string",
                defaultOption: "string",
                options: {
                  record: {
                    values: {
                      type: {
                        label: { type: "string", optional: true },
                        env: { record: { values: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      selected_config_options: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: { type: "string" },
          },
        },
      },
      logs: `TEXT`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
    },
  },

  login_attempts: {
    // dropIfExists: true,
    columns: {
      id: `BIGSERIAL PRIMARY KEY`,
      type: SESSION_TYPE,
      auth_type: {
        enum: [
          "session-id",
          "registration",
          "email-confirmation",
          "magic-link-registration",
          "magic-link",
          "otp-code",
          "login",
          "oauth",
        ],
      },
      username: "TEXT",
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      failed: "BOOLEAN",
      magic_link_id: "TEXT",
      sid: "TEXT",
      auth_provider:
        "TEXT CHECK(auth_type <> 'oauth' OR auth_provider IS NOT NULL)",
      ip_address: `INET NOT NULL`,
      ip_address_remote: "TEXT NOT NULL",
      x_real_ip: "TEXT NOT NULL",
      user_agent: "TEXT NOT NULL",
      info: "TEXT",
    },
  },
  database_configs: {
    constraints: {
      uniqueDatabase: { type: "UNIQUE", content: UNIQUE_DB_FIELDLIST },
    },
    columns: {
      id: `SERIAL PRIMARY KEY`,
      db_name: `TEXT NOT NULL`,
      db_host: `TEXT NOT NULL`,
      db_port: `INTEGER NOT NULL`,
      rest_api_enabled: `BOOLEAN DEFAULT FALSE`,
      sync_users: `BOOLEAN DEFAULT FALSE`,
      table_config: {
        info: { hint: `Table configurations` },
        nullable: true,
        jsonbSchema: tableConfigSchema,
      },
      table_config_ts: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Table configurations from typescript. Must export const tableConfig`,
        },
      },
      table_config_ts_disabled: {
        sqlDefinition: "BOOLEAN",
        info: {
          hint: `If true then Table configurations will not be executed`,
        },
      },
      table_schema_positions: {
        nullable: true,
        jsonbSchema: {
          record: {
            partial: true,
            values: {
              type: {
                x: "number",
                y: "number",
              },
            },
          },
        },
      },
      table_schema_transform: {
        nullable: true,
        jsonbSchemaType: {
          translate: {
            type: {
              x: "number",
              y: "number",
            },
          },
          scale: "number",
        },
      },
      file_table_config: {
        info: { hint: `File storage configurations` },
        nullable: true,
        jsonbSchemaType: {
          fileTable: { type: "string", optional: true },
          storageType: {
            oneOfType: [
              { type: { enum: ["local"] } },
              {
                type: { enum: ["S3"] },
                credential_id: { type: "number" },
              },
            ],
          },
          referencedTables: { type: "any", optional: true },
          delayedDelete: {
            optional: true,
            type: {
              /**
               * Minimum amount of time measured in days for which the files will not be deleted after requesting delete
               */
              deleteAfterNDays: { type: "number" },
              /**
               * How freuquently the files will be checked for deletion delay
               */
              checkIntervalHours: { type: "number", optional: true },
            },
          },
        },
      },

      backups_config: {
        nullable: true,
        info: { hint: `Automatic backups configurations` },
        jsonbSchemaType: {
          enabled: { type: "boolean", optional: true },
          cloudConfig: {
            nullable: true,
            type: {
              /**
               * If not provided then save to current server
               */
              credential_id: { type: "number", nullable: true, optional: true },
            },
          },
          frequency: { enum: ["daily", "monthly", "weekly", "hourly"] },

          /**
           * If provided then will do the backup during that hour (24 hour format). Unless the backup frequency is less than a day
           */
          hour: { type: "integer", optional: true },

          /**
           * If provided then will do the backup during that hour (1-7: Mon to Sun). Unless the backup frequency is less than a day
           */
          dayOfWeek: { type: "integer", optional: true },

          /**
           * If provided then will do the backup during that day (1-31) or earlier if the month is shorter. Unless the backup frequency is not monthly
           */
          dayOfMonth: { type: "integer", optional: true },

          /**
           * If provided then will keep the latest N backups and delete the older ones
           */
          keepLast: { type: "integer", optional: true },

          /**
           * If not enough space will show this error
           */
          err: { type: "string", optional: true, nullable: true },

          dump_options: DUMP_OPTIONS_SCHEMA.jsonbSchema,
        },
      },
    },
  },
  database_config_logs: {
    columns: {
      id: `SERIAL PRIMARY KEY REFERENCES database_configs (id) ON DELETE CASCADE`,
      on_mount_logs: {
        sqlDefinition: "TEXT",
        info: { hint: `On mount logs` },
      },
      table_config_logs: {
        sqlDefinition: "TEXT",
        info: { hint: `On mount logs` },
      },
      on_run_logs: {
        sqlDefinition: "TEXT",
        info: { hint: `On mount logs` },
      },
    },
  },

  ...tableConfigConnections,

  alerts: {
    columns: {
      id: `BIGSERIAL PRIMARY KEY`,
      title: "TEXT",
      message: "TEXT",
      severity: { enum: ["info", "warning", "error"] },
      database_config_id:
        "INTEGER REFERENCES database_configs(id) ON DELETE SET NULL",
      connection_id: "UUID REFERENCES connections(id) ON DELETE SET NULL",
      section: { enum: CONNECTION_CONFIG_SECTIONS, nullable: true },
      data: "JSONB",
      created: "TIMESTAMPTZ DEFAULT NOW()",
    },
  },
  alert_viewed_by: {
    columns: {
      id: `BIGSERIAL PRIMARY KEY`,
      alert_id: "BIGINT REFERENCES alerts(id) ON DELETE CASCADE",
      user_id: "UUID REFERENCES users(id) ON DELETE CASCADE",
      viewed: "TIMESTAMPTZ DEFAULT NOW()",
    },
  },

  ...tableConfigPublishedMethods,

  ...tableConfigAccessControl,

  magic_links: {
    // dropIfExistsCascade: true,
    columns: {
      id: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      magic_link: `TEXT`,
      magic_link_used: `TIMESTAMPTZ`,
      expires: `BIGINT NOT NULL`,
      session_expires: `BIGINT NOT NULL DEFAULT 0`,
    },
  },

  credential_types: {
    // dropIfExistsCascade: true,
    isLookupTable: {
      values: {
        AWS: {
          description: "S3",
        },
        Cloudflare: {
          description: "R2",
        },
      },
    },
  },

  credentials: {
    // dropIfExists: true,
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: { sqlDefinition: `TEXT`, info: { hint: "optional" } },
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      type: {
        label: "Provider",
        sqlDefinition: `TEXT NOT NULL REFERENCES credential_types(id) `,
      },
      key_id: `TEXT NOT NULL`,
      key_secret: `TEXT NOT NULL`,
      endpoint_url: `TEXT NOT NULL DEFAULT ''`,
      bucket: { sqlDefinition: `TEXT` },
      region: { sqlDefinition: `TEXT`, info: { hint: "e.g. auto, us-east-1" } },
    },
  },

  ...tableConfigBackups,

  ...tableConfigWorkspaces,

  ...tableConfigWindows,

  ...tableConfigGlobalSettings,

  ...tableConfigLinks,

  stats: {
    columns: {
      database_id: `INTEGER NOT NULL REFERENCES database_configs(id) ON DELETE CASCADE`,

      datid: "INTEGER",
      datname: "TEXT",
      pid: "INTEGER NOT NULL",
      usesysid: "INTEGER",
      usename: {
        sqlDefinition: "TEXT",
        info: { hint: `Name of the user logged into this backend` },
      },
      application_name: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Name of the application that is connected to this backend`,
        },
      },
      client_addr: {
        sqlDefinition: "TEXT",
        info: {
          hint: `IP address of the client connected to this backend. If this field is null, it indicates either that the client is connected via a Unix socket on the server machine or that this is an internal process such as autovacuum.`,
        },
      },
      client_hostname: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Host name of the connected client, as reported by a reverse DNS lookup of client_addr. This field will only be non-null for IP connections, and only when log_hostname is enabled.`,
        },
      },
      client_port: {
        sqlDefinition: "INTEGER",
        info: {
          hint: `TCP port number that the client is using for communication with this backend, or -1 if a Unix socket is used. If this field is null, it indicates that this is an internal server process.`,
        },
      },
      backend_start: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Time when this process was started. For client backends, this is the time the client connected to the server.`,
        },
      },
      xact_start: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Time when this process' current transaction was started, or null if no transaction is active. If the current query is the first of its transaction, this column is equal to the query_start column.`,
        },
      },
      query_start: {
        sqlDefinition: "TIMESTAMPTZ",
        info: {
          hint: `Time when the currently active query was started, or if state is not active, when the last query was started`,
        },
      },
      state_change: {
        sqlDefinition: "TEXT",
        info: { hint: `Time when the state was last changed` },
      },
      wait_event_type: {
        sqlDefinition: "TEXT",
        info: {
          hint: `The type of event for which the backend is waiting, if any; otherwise NULL. See Table 28.4.`,
        },
      },
      wait_event: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Wait event name if backend is currently waiting, otherwise NULL. See Table 28.5 through Table 28.13.`,
        },
      },
      state: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Current overall state of this backend. Possible values are: active: The backend is executing a query. idle: The backend is waiting for a new client command. idle in transaction: The backend is in a transaction, but is not currently executing a query. idle in transaction (aborted): This state is similar to idle in transaction, except one of the statements in the transaction caused an error. fastpath function call: The backend is executing a fast-path function. disabled: This state is reported if track_activities is disabled in this backend.`,
        },
      },
      backend_xid: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Top-level transaction identifier of this backend, if any.`,
        },
      },
      backend_xmin: {
        sqlDefinition: "TEXT",
        info: { hint: `The current backend's xmin horizon.` },
      },
      query: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Text of this backend's most recent query. If state is active this field shows the currently executing query. In all other states, it shows the last query that was executed. By default the query text is truncated at 1024 bytes; this value can be changed via the parameter track_activity_query_size.`,
        },
      },
      backend_type: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Type of current backend. Possible types are autovacuum launcher, autovacuum worker, logical replication launcher, logical replication worker, parallel worker, background writer, client backend, checkpointer, archiver, startup, walreceiver, walsender and walwriter. In addition, background workers registered by extensions may have additional types.`,
        },
      },
      blocked_by: {
        sqlDefinition: "INTEGER[]",
        info: {
          hint: `Process ID(s) of the sessions that are blocking the server process with the specified process ID from acquiring a lock. One server process blocks another if it either holds a lock that conflicts with the blocked process's lock request (hard block), or is waiting for a lock that would conflict with the blocked process's lock request and is ahead of it in the wait queue (soft block). When using parallel queries the result always lists client-visible process IDs (that is, pg_backend_pid results) even if the actual lock is held or awaited by a child worker process. As a result of that, there may be duplicated PIDs in the result. Also note that when a prepared transaction holds a conflicting lock, it will be represented by a zero process ID.`,
        },
      },
      blocked_by_num: "INTEGER NOT NULL DEFAULT 0",
      id_query_hash: {
        sqlDefinition: "TEXT",
        info: {
          hint: `Computed query identifier (md5(pid || query)) used in stopping queries`,
        },
      },

      cpu: {
        sqlDefinition: "NUMERIC",
        info: {
          hint: `CPU Utilisation. CPU time used divided by the time the process has been running. It will not add up to 100% unless you are lucky`,
        },
      },
      mem: {
        sqlDefinition: "NUMERIC",
        info: {
          hint: `Ratio of the process's resident set size  to the physical memory on the machine, expressed as a percentage`,
        },
      },
      memPretty: {
        sqlDefinition: "TEXT",
        info: { hint: `mem value as string` },
      },
      mhz: { sqlDefinition: "TEXT", info: { hint: `Core MHz value` } },
      cmd: {
        sqlDefinition: "TEXT",
        info: { hint: `Command with all its arguments as a string` },
      },
      sampled_at: {
        sqlDefinition: "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        info: { hint: `When the statistics were collected` },
      },
    },
    constraints: {
      stats_pkey: "PRIMARY KEY(pid, database_id)",
    },
  },
  ...tableConfigLLM,
  ...loggerTableConfig,
  ...tableConfigMCPServers,
};
