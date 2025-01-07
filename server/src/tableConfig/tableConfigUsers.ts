import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import {
  OAuthProviderOptions,
  PASSWORDLESS_ADMIN_USERNAME,
} from "../../../commonTypes/OAuthUtils";

export const tableConfigUsers = {
  users: {
    columns: {
      id: { sqlDefinition: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` },
      status: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id)`,
        info: { hint: "Only active users can access the system" },
      },
      username: {
        sqlDefinition: `TEXT NOT NULL UNIQUE CHECK(length(username) > 0)`,
      },
      name: {
        sqlDefinition: `TEXT`,
        info: { hint: "Display name, if empty username will be shown" },
      },
      email: { sqlDefinition: `TEXT` },
      registration: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["password-w-email-confirmation"] },
              email_confirmation: {
                oneOfType: [
                  {
                    status: { enum: ["confirmed"] },
                    date: "Date",
                  },
                  {
                    status: { enum: ["pending"] },
                    confirmation_code: { type: "string" },
                    date: "Date",
                  },
                ],
              },
            },
            {
              type: { enum: ["magic-link"] },
              otp_code: { type: "string" },
              date: "Date",
              used_on: { type: "Date", optional: true },
            },
            {
              type: { enum: ["OAuth"] },
              provider: {
                enum: Object.keys(OAuthProviderOptions),
                description: "OAuth provider name. E.g.: google, github",
              },
              user_id: "string",
              profile: "any",
            },
          ],
        },
      },
      auth_provider: {
        sqlDefinition: `TEXT`,
        info: { hint: "OAuth provider name. E.g.: google, github" },
      },
      auth_provider_user_id: {
        sqlDefinition: `TEXT`,
        info: { hint: "User id" },
      },
      auth_provider_profile: {
        sqlDefinition: `JSONB`,
        info: { hint: "OAuth provider profile data" },
      }, //  CHECK(auth_provider IS NOT NULL AND auth_provider_profile IS NOT NULL)
      password: {
        sqlDefinition: `TEXT NOT NULL`, // DEFAULT gen_random_uuid()`,
        info: { hint: "Hashed with the user id on insert/update" },
      },
      type: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'default' REFERENCES user_types (id)`,
      },
      passwordless_admin: {
        sqlDefinition: `BOOLEAN`,
        info: {
          hint: "If true and status is active: enables passwordless access for default install. First connected client will have perpetual admin access and no other users are allowed ",
        },
      },
      created: { sqlDefinition: `TIMESTAMP DEFAULT NOW()` },
      last_updated: {
        sqlDefinition: `BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000`,
      },
      options: {
        nullable: true,
        jsonbSchemaType: {
          showStateDB: {
            type: "boolean",
            optional: true,
            description: "Show the prostgles database in the connections list",
          },
          hideNonSSLWarning: {
            type: "boolean",
            optional: true,
            description:
              "Hides the top warning when accessing the website over an insecure connection (non-HTTPS)",
          },
          viewedSQLTips: {
            type: "boolean",
            optional: true,
            description: "Will hide SQL tips if true",
          },
          viewedAccessInfo: {
            type: "boolean",
            optional: true,
            description: "Will hide passwordless user tips if true",
          },
          theme: { enum: ["dark", "light", "from-system"], optional: true },
        },
      },
      "2fa": {
        nullable: true,
        jsonbSchemaType: {
          secret: { type: "string" },
          recoveryCode: { type: "string" },
          enabled: { type: "boolean" },
        },
      },
      has_2fa_enabled: `BOOLEAN GENERATED ALWAYS AS ( ("2fa"->>'enabled')::BOOLEAN ) STORED`,
    },
    constraints: {
      [`passwordless_admin type AND username CHECK`]: `CHECK(COALESCE(passwordless_admin, false) = FALSE OR type = 'admin' AND username = '${PASSWORDLESS_ADMIN_USERNAME}')`,
    },
    indexes: {
      "Only one passwordless_admin admin account allowed": {
        unique: true,
        columns: `passwordless_admin`,
        where: `passwordless_admin = true`,
      },
    },
    triggers: {
      atLeastOneActiveAdmin: {
        actions: ["delete", "update"],
        type: "after",
        forEach: "statement",
        query: `
          BEGIN
            IF NOT EXISTS(SELECT * FROM users WHERE type = 'admin' AND status = 'active') THEN
              RAISE EXCEPTION 'Must have at least one active admin user';
            END IF;

            RETURN NULL;
          END;
        `,
      },
    },
  },
} as const satisfies TableConfig<{ en: 1 }>;
