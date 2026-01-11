import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { DUMP_OPTIONS_SCHEMA } from "./tableConfigBackups";
import { OAuthProviderOptions } from "@common/OAuthUtils";

export const UNIQUE_DB_COLS = ["db_name", "db_host", "db_port"] as const;
const UNIQUE_DB_FIELDLIST = UNIQUE_DB_COLS.join(", ");

const commonAuthSchema = {
  enabled: { type: "boolean", optional: true },
  clientID: { type: "string" },
  clientSecret: { type: "string" },
} satisfies JSONB.FieldTypeObj["type"];

const EmailTemplateConfig = {
  title:
    "Email template used for sending auth emails. Must contain placeholders for the url: ${url}",
  type: {
    from: "string",
    subject: "string",
    body: "string",
  },
} as const satisfies JSONB.FieldTypeObj;
const SMTPConfig = {
  oneOfType: [
    {
      type: { enum: ["smtp"] },
      host: { type: "string" },
      port: { type: "number" },
      secure: { type: "boolean", optional: true },
      rejectUnauthorized: { type: "boolean", optional: true },
      user: { type: "string" },
      pass: { type: "string" },
    },
    {
      type: { enum: ["aws-ses"] },
      region: { type: "string" },
      accessKeyId: { type: "string" },
      secretAccessKey: { type: "string" },
      /**
       * Sending rate per second
       * Defaults to 1
       */
      sendingRate: { type: "integer", optional: true },
    },
  ],
} as const satisfies JSONB.FieldTypeObj;

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

export const tableConfigDatabaseConfig: TableConfig<{ en: 1 }> = {
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

      /** TODO: improve naming */
      tableConfig: {
        info: { hint: "Schema used to create prostgles-ui" },
        sqlDefinition: "JSONB",
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

      allowed_origin: {
        sqlDefinition: "TEXT",
        label: "Allow-Origin",
        info: {
          hint: "Specifies which domains can access this app in a cross-origin manner. \nSets the Access-Control-Allow-Origin header. \nUse '*' or a specific URL to allow API access",
        },
      },
      allowed_ips: {
        sqlDefinition: `cidr[] NOT NULL DEFAULT '{}'`,
        label: "Allowed IPs and subnets",
        info: { hint: "List of allowed IP addresses in ipv4 or ipv6 format" },
      },
      allowed_ips_enabled: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE CHECK(allowed_ips_enabled = FALSE OR cardinality(allowed_ips) > 0)`,
        info: { hint: "If enabled then only allowed IPs can connect" },
      },
      trust_proxy: {
        sqlDefinition: `boolean NOT NULL DEFAULT FALSE`,
        info: {
          hint: "If true then will use the IP from 'X-Forwarded-For' header",
        },
      },

      enable_logs: {
        sqlDefinition: `boolean NOT NULL DEFAULT FALSE`,
        info: {
          hint: "Logs are saved in the logs table from the state database",
        },
        label: "Enable logs (experimental)",
      },
      session_max_age_days: {
        sqlDefinition: `INTEGER NOT NULL DEFAULT 14 CHECK(session_max_age_days > 0)`,
        info: {
          hint: "Number of days a user will stay logged in",
          min: 1,
          max: Number.MAX_SAFE_INTEGER,
        },
      },
      magic_link_validity_days: {
        sqlDefinition: `INTEGER NOT NULL DEFAULT 1 CHECK(magic_link_validity_days > 0)`,
        info: {
          hint: "Number of days a magic link can be used to log in",
          min: 1,
          max: Number.MAX_SAFE_INTEGER,
        },
      },
      login_rate_limit_enabled: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT TRUE`,
        info: {
          hint: "If enabled then each client defined by <groupBy> that fails <maxAttemptsPerHour> in an hour will not be able to login for the rest of the hour",
        },
        label: "Enable failed login rate limit",
      },
      login_rate_limit: {
        defaultValue: {
          maxAttemptsPerHour: 5,
          groupBy: "ip",
        },
        jsonbSchemaType: {
          maxAttemptsPerHour: {
            type: "integer",
            description: "Maximum number of login attempts allowed per hour",
          },
          groupBy: {
            description: "The IP address used to group login attempts",
            enum: ["x-real-ip", "remote_ip", "ip"],
          },
        },
        label: "Failed login rate limit options",
        info: { hint: "List of allowed IP addresses in ipv4 or ipv6 format" },
      },
      auth_created_user_type: {
        info: {
          hint: "User type assigned to new users. Defaults to 'default'",
        },
        sqlDefinition: `TEXT REFERENCES user_types`,
      },
      auth_providers: {
        info: {
          hint: "The provided credentials will allow users to register and sign in. The redirect uri format is {website_url}/auth/{providerName}/callback",
        },
        nullable: true,
        jsonbSchemaType: {
          website_url: { type: "string", title: "Website URL" },
          email: {
            optional: true,
            oneOfType: [
              {
                signupType: { enum: ["withMagicLink"] },
                enabled: { type: "boolean", optional: true },
                smtp: SMTPConfig,
                emailTemplate: EmailTemplateConfig,
                emailConfirmationEnabled: {
                  type: "boolean",
                  optional: true,
                  title: "Enable email confirmation",
                },
              },
              {
                signupType: { enum: ["withPassword"] },
                enabled: { type: "boolean", optional: true },
                minPasswordLength: {
                  optional: true,
                  type: "integer",
                  title: "Minimum password length",
                },
                smtp: SMTPConfig,
                emailTemplate: EmailTemplateConfig,
                emailConfirmationEnabled: {
                  type: "boolean",
                  optional: true,
                  title: "Enable email confirmation",
                },
              },
            ],
          },
          google: {
            optional: true,
            type: {
              ...commonAuthSchema,
              authOpts: {
                optional: true,
                type: {
                  scope: {
                    type: "string[]",
                    allowedValues: OAuthProviderOptions.google.scopes.map(
                      (s) => s.key,
                    ),
                  },
                },
              },
            },
          },
          github: {
            optional: true,
            type: {
              ...commonAuthSchema,
              authOpts: {
                optional: true,
                type: {
                  scope: {
                    type: "string[]",
                    allowedValues: OAuthProviderOptions.github.scopes.map(
                      (s) => s.key,
                    ),
                  },
                },
              },
            },
          },
          microsoft: {
            optional: true,
            type: {
              ...commonAuthSchema,
              authOpts: {
                optional: true,
                type: {
                  prompt: {
                    enum: OAuthProviderOptions.microsoft.prompts.map(
                      (s) => s.key,
                    ),
                  },
                  scope: {
                    type: "string[]",
                    allowedValues: OAuthProviderOptions.microsoft.scopes.map(
                      (s) => s.key,
                    ),
                  },
                },
              },
            },
          },
          facebook: {
            optional: true,
            type: {
              ...commonAuthSchema,
              authOpts: {
                optional: true,
                type: {
                  scope: {
                    type: "string[]",
                    allowedValues: OAuthProviderOptions.facebook.scopes.map(
                      (s) => s.key,
                    ),
                  },
                },
              },
            },
          },
          customOAuth: {
            optional: true,
            type: {
              ...commonAuthSchema,
              displayName: { type: "string" },
              displayIconPath: { type: "string", optional: true },
              authorizationURL: { type: "string" },
              tokenURL: { type: "string" },
              authOpts: {
                optional: true,
                type: {
                  scope: {
                    type: "string[]",
                  },
                },
              },
            },
          },
        },
      },
      pass_process_env_vars_to_server_side_functions: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE`,
        info: {
          hint: "If true then all environment variables will be passed to the server side function nodejs. Use at your own risk",
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
};
