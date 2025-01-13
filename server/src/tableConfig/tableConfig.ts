import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { CONNECTION_CONFIG_SECTIONS } from "../../../commonTypes/utils";
import { loggerTableConfig } from "../Logger";
import { tableConfigGlobalSettings } from "./tableConfigGlobalSettings";
import { tableConfigUsers } from "./tableConfigUsers";
import { tableConfigConnections } from "./tableConfigConnections";
import { tableConfigPublishedMethods } from "./tableConfigPublishedMethods";

export const UNIQUE_DB_COLS = ["db_name", "db_host", "db_port"] as const;
const UNIQUE_DB_FIELDLIST = UNIQUE_DB_COLS.join(", ");
const DUMP_OPTIONS_SCHEMA = {
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
  // defaultValue: "{}"
} as const;

const FieldFilterSchema = {
  oneOf: [
    "string[]",
    { enum: ["*", ""] },
    {
      record: {
        values: { enum: [1, true] },
      },
    },
    {
      record: {
        values: { enum: [0, false] },
      },
    },
  ],
} satisfies JSONB.FieldType;

const tableConfigSchema: JSONB.JSONBSchema<JSONB.FieldTypeObj> = {
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

const CommonLinkOpts = {
  colorArr: { type: "number[]", optional: true },
} as const;

const filter = {
  oneOfType: [{ $and: "any[]" }, { $or: "any[]" }],
  optional: true,
} as const;

const joinPath = {
  description:
    "When adding a chart this allows showing data from a table that joins to the current table",
  arrayOfType: {
    table: "string",
    on: { arrayOf: { record: { values: "any" } } },
  },
  optional: true,
} as const satisfies JSONB.FieldTypeObj;
const CommonChartLinkOpts = {
  dataSource: {
    optional: true,
    oneOfType: [
      {
        type: {
          enum: ["sql"],
          description:
            "Show data from an SQL query within an editor. Will not reflect latest changes to that query (must be re-added)",
        },
        sql: "string",
        withStatement: "string",
      },
      {
        type: {
          enum: ["table"],
          description:
            "Shows data from an opened table window. Any filters from that table will apply to the chart as well",
        },
        joinPath,
      },
      {
        type: {
          enum: ["local-table"],
          description:
            "Shows data from postgres table not connected to any window (w1_id === w2_id === current chart window). Custom filters can be added",
        },
        localTableName: { type: "string" },
        smartGroupFilter: filter,
      },
    ],
  },
  smartGroupFilter: filter,
  joinPath,
  localTableName: {
    type: "string",
    optional: true,
    description:
      "If provided then this is a local layer (w1_id === w2_id === current chart window)",
  },
  sql: {
    description: "Defined if chart links to SQL statement",
    optional: true,
    type: "string",
  },
} as const satisfies JSONB.ObjectType["type"];

export const tableConfig: TableConfig<{ en: 1 }> = {
  user_types: {
    isLookupTable: {
      values: {
        admin: {
          en: "Highest access level",
        },
        public: {
          en: "Public user. Account created on login and deleted on logout",
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
      values: { active: {}, disabled: {} },
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
      created: `TIMESTAMP DEFAULT NOW()`,
      last_used: `TIMESTAMP DEFAULT NOW()`,
      expires: `BIGINT NOT NULL`,
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
      created: `TIMESTAMP DEFAULT NOW()`,
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
      created: "TIMESTAMP DEFAULT NOW()",
    },
  },
  alert_viewed_by: {
    columns: {
      id: `BIGSERIAL PRIMARY KEY`,
      alert_id: "BIGINT REFERENCES alerts(id) ON DELETE CASCADE",
      user_id: "UUID REFERENCES users(id) ON DELETE CASCADE",
      viewed: "TIMESTAMP DEFAULT NOW()",
    },
  },

  access_control: {
    // dropIfExistsCascade: true,
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: "TEXT",
      database_id: `INTEGER NOT NULL REFERENCES database_configs(id) ON DELETE CASCADE`,
      llm_daily_limit: {
        sqlDefinition: `INTEGER NOT NULL DEFAULT 0 CHECK(llm_daily_limit >= 0)`,
        info: { hint: "Maximum amount of queires per user/ip per 24hours" },
      },
      dbsPermissions: {
        info: { hint: "Permission types and rules for the state database" },
        nullable: true,
        jsonbSchemaType: {
          createWorkspaces: { type: "boolean", optional: true },
          viewPublishedWorkspaces: {
            optional: true,
            type: {
              workspaceIds: "string[]",
            },
          },
        },
      },
      dbPermissions: {
        info: {
          hint: "Permission types and rules for this (connection_id) database",
        },
        jsonbSchema: {
          oneOfType: [
            {
              type: {
                enum: ["Run SQL"],
                description: "Allows complete access to the database",
              },
              allowSQL: { type: "boolean", optional: true },
            },
            {
              type: {
                enum: ["All views/tables"],
                description: "Custom access (View/Edit/Remove) to all tables",
              },
              allowAllTables: {
                type: "string[]",
                allowedValues: ["select", "insert", "update", "delete"],
              },
            },
            {
              type: {
                enum: ["Custom"],
                description: "Fine grained access to specific tables",
              },
              customTables: {
                arrayOfType: {
                  tableName: "string",
                  select: {
                    optional: true,
                    description: "Allows viewing data",
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                          subscribe: {
                            optional: true,
                            type: {
                              throttle: { optional: true, type: "integer" },
                            },
                          },
                          filterFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          orderByFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                        },
                      },
                    ],
                  },
                  update: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                          checkFilterDetailed: { optional: true, type: "any" },
                          filterFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          orderByFields: {
                            optional: true,
                            ...FieldFilterSchema,
                          },
                          forcedDataDetail: { optional: true, type: "any[]" },
                          dynamicFields: {
                            optional: true,
                            arrayOfType: {
                              filterDetailed: "any",
                              fields: FieldFilterSchema,
                            },
                          },
                        },
                      },
                    ],
                  },
                  insert: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          fields: FieldFilterSchema,
                          forcedDataDetail: { optional: true, type: "any[]" },
                          checkFilterDetailed: { optional: true, type: "any" },
                        },
                      },
                    ],
                  },
                  delete: {
                    optional: true,
                    oneOf: [
                      "boolean",
                      {
                        type: {
                          filterFields: FieldFilterSchema,
                          forcedFilterDetailed: { optional: true, type: "any" },
                        },
                      },
                    ],
                  },
                  sync: {
                    optional: true,
                    type: {
                      id_fields: { type: "string[]" },
                      synced_field: { type: "string" },
                      throttle: { optional: true, type: "integer" },
                      allow_delete: { type: "boolean", optional: true },
                    },
                  },
                },
              },
            },
          ],
        },
      },

      created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
    },
  },
  ...tableConfigPublishedMethods,
  access_control_user_types: {
    columns: {
      access_control_id: `INTEGER NOT NULL REFERENCES access_control(id)  ON DELETE CASCADE`,
      user_type: `TEXT NOT NULL REFERENCES user_types(id)  ON DELETE CASCADE`,
    },
    constraints: {
      NoDupes: "UNIQUE(access_control_id, user_type)",
    },
  },

  access_control_methods: {
    // dropIfExistsCascade: true,
    columns: {
      published_method_id: `INTEGER NOT NULL REFERENCES published_methods  ON DELETE CASCADE`,
      access_control_id: `INTEGER NOT NULL REFERENCES access_control  ON DELETE CASCADE`,
    },
    constraints: {
      pkey: {
        type: "PRIMARY KEY",
        content: "published_method_id, access_control_id",
      },
    },
  },
  access_control_connections: {
    columns: {
      connection_id: `UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE`,
      access_control_id: `INTEGER NOT NULL REFERENCES access_control  ON DELETE CASCADE`,
    },
    indexes: {
      unique_connection_id: {
        unique: true,
        columns: "connection_id, access_control_id",
      },
    },
  },
  magic_links: {
    // dropIfExistsCascade: true,
    columns: {
      id: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      magic_link: `TEXT`,
      magic_link_used: `TIMESTAMP`,
      expires: `BIGINT NOT NULL`,
      session_expires: `BIGINT NOT NULL DEFAULT 0`,
    },
  },

  credential_types: {
    // dropIfExists: true,
    isLookupTable: {
      values: { s3: {} },
    },
  },

  credentials: {
    // dropIfExists: true,
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: `TEXT NOT NULL DEFAULT ''`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      type: `TEXT NOT NULL REFERENCES credential_types(id) DEFAULT 's3'`,
      key_id: `TEXT NOT NULL`,
      key_secret: `TEXT NOT NULL`,
      bucket: `TEXT`,
      region: `TEXT`,
    },
    constraints: {
      "Bucket or Region missing":
        "CHECK(type <> 's3' OR (bucket IS NOT NULL AND region IS NOT NULL))",
    },
  },

  backups: {
    // dropIfExists: true,
    columns: {
      id: {
        sqlDefinition: `TEXT PRIMARY KEY DEFAULT gen_random_uuid()`,
        info: { hint: "Format: dbname_datetime_uuid" },
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
      uploaded: { sqlDefinition: `TIMESTAMP` },
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
      restore_start: { sqlDefinition: `TIMESTAMP` },
      restore_end: { sqlDefinition: `TIMESTAMP` },
      restore_logs: { sqlDefinition: `TEXT` },
      dump_logs: { sqlDefinition: `TEXT` },
      dbSizeInBytes: {
        sqlDefinition: `BIGINT NOT NULL`,
        label: "Database size on disk",
      },
      sizeInBytes: { sqlDefinition: `BIGINT`, label: "Backup file size" },
      created: { sqlDefinition: `TIMESTAMP NOT NULL DEFAULT NOW()` },
      last_updated: { sqlDefinition: `TIMESTAMP NOT NULL DEFAULT NOW()` },
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

  workspace_publish_modes: {
    isLookupTable: {
      values: {
        fixed: {
          en: "Fixed",
          description: "The workspace layout is fixed",
        },
        editable: {
          en: "Editable",
          description: "The workspace will be cloned layout for each user",
        },
      },
    },
  },

  workspaces: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      connection_id: `UUID NOT NULL REFERENCES connections(id)  ON DELETE CASCADE`,
      name: `TEXT NOT NULL DEFAULT 'default workspace'`,
      created: `TIMESTAMP DEFAULT NOW()`,
      active_row: `JSONB DEFAULT '{}'::jsonb`,
      layout: `JSONB`,
      icon: `TEXT`,
      options: {
        defaultValue: {
          defaultLayoutType: "tab",
          tableListEndInfo: "size",
          tableListSortBy: "extraInfo",
          hideCounts: false,
          pinnedMenu: true,
        },
        jsonbSchemaType: {
          hideCounts: {
            optional: true,
            type: "boolean",
          },
          tableListEndInfo: {
            optional: true,
            enum: ["none", "count", "size"],
          },
          tableListSortBy: {
            optional: true,
            enum: ["name", "extraInfo"],
          },
          showAllMyQueries: {
            optional: true,
            type: "boolean",
          },
          defaultLayoutType: {
            optional: true,
            enum: ["row", "tab", "col"],
          },
          pinnedMenu: {
            optional: true,
            type: "boolean",
          },
          pinnedMenuWidth: {
            optional: true,
            type: "number",
          },
        },
      },
      last_updated: `BIGINT NOT NULL`,
      last_used: `TIMESTAMP NOT NULL DEFAULT now()`,
      deleted: `BOOLEAN NOT NULL DEFAULT FALSE`,
      url_path: `TEXT`,
      parent_workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      published: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE, CHECK(parent_workspace_id IS NULL OR published = FALSE)`,
        info: {
          hint: "If true then this workspace can be shared with other users through Access Control",
        },
      },
      publish_mode: `TEXT REFERENCES workspace_publish_modes `,
    },
    constraints: {
      unique_url_path: `UNIQUE(url_path)`,
      unique_name_per_user_perCon: `UNIQUE(connection_id, user_id, name)`,
    },
  },

  windows: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      parent_window_id: {
        sqlDefinition: `UUID REFERENCES windows(id) ON DELETE CASCADE`,
        info: {
          hint: "If defined then this is a chart for another window and will be rendered within that parent window",
        },
      },
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      /*   ON DELETE SET NULL is used to ensure we don't delete saved SQL queries */
      workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      type: `TEXT CHECK(type IN ('map', 'sql', 'table', 'timechart', 'card', 'method'))`,
      table_name: `TEXT`,
      method_name: `TEXT`,
      table_oid: `INTEGER`,
      sql: `TEXT NOT NULL DEFAULT ''`,
      selected_sql: `TEXT NOT NULL DEFAULT ''`,
      name: `TEXT`,
      limit: `INTEGER DEFAULT 1000 CHECK("limit" > -1 AND "limit" < 100000)`,
      closed: `BOOLEAN DEFAULT FALSE`,
      deleted: `BOOLEAN DEFAULT FALSE CHECK(NOT (type = 'sql' AND deleted = TRUE AND (options->>'sqlWasSaved')::boolean = true))`,
      show_menu: `BOOLEAN DEFAULT FALSE`,
      minimised: {
        info: { hint: "Used for attached charts to hide them" },
        sqlDefinition: `BOOLEAN DEFAULT FALSE`,
      },
      fullscreen: `BOOLEAN DEFAULT TRUE`,
      sort: "JSONB DEFAULT '[]'::jsonb",
      filter: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
      having: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
      options: `JSONB NOT NULL DEFAULT '{}'::jsonb`,
      function_options: {
        nullable: true,
        jsonbSchemaType: {
          showDefinition: {
            type: "boolean",
            optional: true,
            description: "Show the function definition",
          },
        },
      },
      sql_options: {
        defaultValue: {
          executeOptions: "block",
          errorMessageDisplay: "both",
          tabSize: 2,
        },
        jsonbSchemaType: {
          executeOptions: {
            optional: true,
            description:
              "Behaviour of execute (ALT + E). Defaults to 'block' \nfull = run entire sql   \nblock = run code block where the cursor is",
            enum: ["full", "block", "smallest-block"],
          },
          errorMessageDisplay: {
            optional: true,
            description:
              "Error display locations. Defaults to 'both' \ntooltip = show within tooltip only   \nbottom = show in bottom control bar only   \nboth = show in both locations",
            enum: ["tooltip", "bottom", "both"],
          },
          tabSize: {
            type: "integer",
            optional: true,
          },
          lineNumbers: {
            optional: true,
            enum: ["on", "off"],
          },
          renderMode: {
            optional: true,
            description: "Show query results in a table or a JSON",
            enum: ["table", "csv", "JSON"],
          },
          minimap: {
            optional: true,
            description: "Shows a vertical code minimap to the right",
            type: { enabled: { type: "boolean" } },
          },
          acceptSuggestionOnEnter: {
            description: "Insert suggestions on Enter. Tab is the default key",
            optional: true,
            enum: ["on", "smart", "off"],
          },
          expandSuggestionDocs: {
            optional: true,
            description:
              "Toggle suggestions documentation tab. Requires page refresh. Enabled by default",
            type: "boolean",
          },
          maxCharsPerCell: {
            type: "integer",
            optional: true,
            description:
              "Defaults to 1000. Maximum number of characters to display for each cell. Useful in improving performance",
          },
          theme: {
            optional: true,
            enum: ["vs", "vs-dark", "hc-black", "hc-light"],
          },
          showRunningQueryStats: {
            optional: true,
            description:
              "(Experimental) Display running query stats (CPU and Memory usage) in the bottom bar",
            type: "boolean",
          },
        },
      },
      columns: `JSONB`,
      nested_tables: `JSONB`,
      created: `TIMESTAMP NOT NULL DEFAULT NOW()`,
      last_updated: `BIGINT NOT NULL`,
    },
  },

  ...tableConfigGlobalSettings,

  links: {
    columns: {
      id: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      user_id: `UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE`,
      w1_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
      w2_id: `UUID NOT NULL REFERENCES windows(id)  ON DELETE CASCADE`,
      workspace_id: `UUID REFERENCES workspaces(id) ON DELETE SET NULL`,
      disabled: "boolean",
      options: {
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["table"] },
              ...CommonLinkOpts,
              tablePath: {
                ...joinPath,
                optional: false,
                description: "Table path from w1.table_name to w2.table_name",
              },
            },
            {
              type: { enum: ["map"] },
              ...CommonChartLinkOpts,
              osmLayerQuery: {
                type: "string",
                optional: true,
                description:
                  "If provided then this is a OSM layer (w1_id === w2_id === current chart window)",
              },
              mapIcons: {
                optional: true,
                oneOfType: [
                  {
                    type: { enum: ["fixed"] },
                    iconPath: "string",
                  },
                  {
                    type: { enum: ["conditional"] },
                    columnName: "string",
                    conditions: {
                      arrayOfType: {
                        value: "any",
                        iconPath: "string",
                      },
                    },
                  },
                ],
              },
              mapColorMode: {
                optional: true,
                oneOfType: [
                  {
                    type: { enum: ["fixed"] },
                    colorArr: "number[]",
                  },
                  {
                    type: { enum: ["scale"] },
                    columnName: "string",
                    min: "number",
                    max: "number",
                    minColorArr: "number[]",
                    maxColorArr: "number[]",
                  },
                  {
                    type: { enum: ["conditional"] },
                    columnName: "string",
                    conditions: {
                      arrayOfType: {
                        value: "any",
                        colorArr: "number[]",
                      },
                    },
                  },
                ],
              },
              mapShowText: {
                optional: true,
                type: {
                  columnName: { type: "string" },
                },
              },
              columns: {
                arrayOfType: {
                  name: {
                    type: "string",
                    description: "Geometry/Geography column",
                  },
                  colorArr: "number[]",
                },
              },
            },
            {
              type: { enum: ["timechart"] },
              ...CommonChartLinkOpts,
              groupByColumn: {
                type: "string",
                optional: true,
                description: "Used by timechart",
              },
              otherColumns: {
                arrayOfType: {
                  name: "string",
                  label: { type: "string", optional: true },
                  udt_name: "string",
                },
                optional: true,
              },
              columns: {
                arrayOfType: {
                  name: { type: "string", description: "Date column" },
                  colorArr: "number[]",
                  statType: {
                    optional: true,
                    type: {
                      funcName: {
                        enum: ["$min", "$max", "$countAll", "$avg", "$sum"],
                      },
                      numericColumn: "string",
                    },
                  },
                },
              },
            },
          ],
        },
      },
      closed: `BOOLEAN DEFAULT FALSE`,
      deleted: `BOOLEAN DEFAULT FALSE`,
      created: `TIMESTAMP DEFAULT NOW()`,
      last_updated: `BIGINT NOT NULL`,
    },
  },

  database_stats: {
    columns: {
      database_config_id:
        "INTEGER REFERENCES database_configs(id) ON DELETE SET NULL",
    },
  },

  stats: {
    // dropIfExists: true,
    columns: {
      connection_id: `UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE`,

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
        sqlDefinition: "TIMESTAMP",
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
    },
    constraints: {
      stats_pkey: "PRIMARY KEY(pid, connection_id)",
    },
  },
  llm_credentials: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'Default credential'`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      endpoint: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'https://api.openai.com/v1/chat/completions'`,
      },
      config: {
        jsonbSchema: {
          oneOfType: [
            {
              Provider: { enum: ["OpenAI"] },
              API_Key: { type: "string" },
              model: { type: "string" },
              temperature: { type: "number", optional: true },
              frequency_penalty: { type: "number", optional: true },
              max_completion_tokens: { type: "integer", optional: true },
              presence_penalty: { type: "number", optional: true },
              response_format: {
                enum: ["json", "text", "srt", "verbose_json", "vtt"],
                optional: true,
              },
            },
            {
              Provider: { enum: ["Anthropic"] },
              API_Key: { type: "string" },
              "anthropic-version": { type: "string" },
              model: { type: "string" },
              max_tokens: { type: "integer" },
            },
            {
              Provider: { enum: ["Custom"] },
              headers: { record: { values: "string" }, optional: true },
              body: { record: { values: "string" }, optional: true },
            },
            {
              Provider: { enum: ["Prostgles"] },
              API_Key: { type: "string" },
            },
          ],
        },
        defaultValue: {
          Provider: "OpenAI",
          model: "gpt-4o",
          API_Key: "",
        },
      },
      is_default: {
        sqlDefinition: `BOOLEAN DEFAULT FALSE`,
        info: { hint: "If true then this is the default credential" },
      },
      result_path: {
        sqlDefinition: `_TEXT `,
        info: {
          hint: "Will use corect defaults for OpenAI and Anthropic. Path to text response. E.g.: choices,0,message,content",
        },
      },
      created: {
        sqlDefinition: `TIMESTAMP DEFAULT NOW()`,
      },
    },
    indexes: {
      unique_llm_credential_name: {
        unique: true,
        columns: "name, user_id",
      },
      unique_default: {
        unique: true,
        columns: "is_default",
        where: "is_default = TRUE",
      },
    },
  },
  llm_prompts: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'New prompt'`,
      description: `TEXT DEFAULT ''`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      prompt: `TEXT NOT NULL CHECK(LENGTH(btrim(prompt)) > 0)`,
      created: `TIMESTAMP DEFAULT NOW()`,
    },
    indexes: {
      unique_llm_prompt_name: {
        unique: true,
        columns: "name, user_id",
      },
    },
  },
  llm_chats: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'New chat'`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      llm_credential_id: `INTEGER REFERENCES llm_credentials(id) ON DELETE SET NULL`,
      llm_prompt_id: `INTEGER REFERENCES llm_prompts(id) ON DELETE SET NULL`,
      created: `TIMESTAMP DEFAULT NOW()`,
      disabled_message: {
        sqlDefinition: `TEXT`,
        info: { hint: "Message to show when chat is disabled" },
      },
      disabled_until: {
        sqlDefinition: `TIMESTAMPTZ`,
        info: { hint: "If set then chat is disabled until this time" },
      },
    },
  },
  llm_messages: {
    columns: {
      id: `int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID REFERENCES users(id) ON DELETE CASCADE`,
      message: `TEXT NOT NULL`,
      created: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  access_control_allowed_llm: {
    columns: {
      access_control_id: `INTEGER NOT NULL REFERENCES access_control(id)`,
      llm_credential_id: `INTEGER NOT NULL REFERENCES llm_credentials(id)`,
      llm_prompt_id: `INTEGER NOT NULL REFERENCES llm_prompts(id)`,
    },
    indexes: {
      unique: {
        unique: true,
        columns: "access_control_id, llm_credential_id, llm_prompt_id",
      },
    },
  },
  ...loggerTableConfig,
};
