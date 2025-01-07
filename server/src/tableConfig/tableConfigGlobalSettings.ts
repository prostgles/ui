import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { OAuthProviderOptions } from "../../../commonTypes/OAuthUtils";

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

export const tableConfigGlobalSettings: TableConfig<{ en: 1 }> = {
  global_settings: {
    // dropIfExistsCascade: true,
    columns: {
      id: "INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY",
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
      updated_by: {
        enum: ["user", "app"],
        defaultValue: "app",
      },
      updated_at: {
        sqlDefinition: "TIMESTAMP NOT NULL DEFAULT now()",
      },
      pass_process_env_vars_to_server_side_functions: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE`,
        info: {
          hint: "If true then all environment variables will be passed to the server side function nodejs. Use at your own risk",
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
      auth_providers: {
        info: {
          hint: "The provided credentials will allow users to register and sign in. The redirect uri format is {website_url}/auth/{providerName}/callback",
        },
        nullable: true,
        jsonbSchemaType: {
          website_url: { type: "string", title: "Website URL" },
          created_user_type: {
            type: "string",
            optional: true,
            title: "User type assigned to new users. Defaults to 'default'",
          },
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
      tableConfig: {
        info: { hint: "Schema used to create prostgles-ui" },
        sqlDefinition: "JSONB",
      },
      prostgles_registration: {
        info: { hint: "Registration options" },
        nullable: true,
        jsonbSchemaType: {
          enabled: { type: "boolean" },
          email: { type: "string" },
          token: { type: "string" },
        },
      },
    },
    triggers: {
      "Update updated_at": {
        actions: ["update"],
        type: "before",
        forEach: "row",
        query: `
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
        `,
      },
    },
  },
};
