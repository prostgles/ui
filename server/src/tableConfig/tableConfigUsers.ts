import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSchema } from "@common/DBGeneratedSchema";
import {
  OAuthProviderOptions,
  PASSWORDLESS_ADMIN_USERNAME,
} from "@common/OAuthUtils";
import { escapeLiteral } from "pg";
import type { TableConfig } from "prostgles-server";

const registrationConfirmation = {
  code_hash: "string",
  confirmed_on: { type: "Date", nullable: true },
  expires: "Date",
} as const;

const pendingRegistrationTypes = [
  "invite",
  "password-w-email-confirmation",
  "magic-link",
] satisfies Extract<
  NonNullable<DBSchema["users"]["registration"]>,
  { confirmed_on: unknown }
>["type"][];

export const tableConfigUsers = {
  users: {
    columns: {
      id: { sqlDefinition: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` },
      status: {
        sqlDefinition: `TEXT NOT NULL DEFAULT 'active' REFERENCES user_statuses (id)`,
        info: { hint: "Only active users can access the system" },
      },
      username: {
        sqlDefinition: `TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 1 AND 255)`,
      },
      name: {
        sqlDefinition: `TEXT`,
        info: { hint: "Display name, if empty username will be shown" },
      },
      email: { sqlDefinition: `TEXT CHECK(length(email) BETWEEN 1 AND 255)` },
      registration: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["invite"] },
              invited_by: "string",
              date: "Date",
              ...registrationConfirmation,
            },
            {
              type: { enum: ["password-w-email-confirmation"] },
              ...registrationConfirmation,
            },
            {
              type: { enum: ["magic-link"] },
              date: "Date",
              ...registrationConfirmation,
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
        sqlDefinition: `TEXT NOT NULL DEFAULT '${USER_TYPES.DEFAULT}' REFERENCES user_types (id)`,
      },
      passwordless_admin: {
        sqlDefinition: `BOOLEAN`,
        info: {
          hint: "If true and status is active: enables passwordless access for default install. First connected client will have perpetual admin access and no other users are allowed ",
        },
      },
      created: { sqlDefinition: `TIMESTAMPTZ DEFAULT NOW()` },
      last_updated: {
        sqlDefinition: `BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000`,
      },
      options: {
        nullable: true,
        jsonbSchemaType: {
          pinnedMenu: {
            type: "boolean",
            optional: true,
            description: "Keep the dashboard menu docked on wide screens",
          },
          pinnedMenuWidth: {
            type: "number",
            optional: true,
            description: "Width of the docked dashboard menu in pixels",
          },
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
          speechMode: {
            optional: true,
            enum: ["off", "stt-local", "stt-web", "audio"],
          },
          speechSendMode: {
            optional: true,
            enum: ["manual", "auto"],
          },
          llmChatWindowPositioning: {
            optional: true,
            enum: ["right-panel", "fullscreen"],
          },
          hideLlmLoadingCounter: {
            type: "boolean",
            optional: true,
            description:
              "Hides the loading counter that is shown when the assistant is generating a message response.",
          },
          lastCwd: {
            type: "string",
            optional: true,
            description:
              "Stores the last used current working directory for the user, to be used as the default path in file tree and terminal features",
          },
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
      has_2fa_enabled: `BOOLEAN GENERATED ALWAYS AS (COALESCE(("2fa"->>'enabled')::BOOLEAN, false)) STORED`,
    },
    constraints: {
      [`passwordless_admin type AND username CHECK`]: `CHECK(COALESCE(passwordless_admin, false) = FALSE OR type = '${USER_TYPES.ADMIN}' AND username = '${PASSWORDLESS_ADMIN_USERNAME}')`,
      users_pending_registration_check: `CHECK(
        status <> ${escapeLiteral("pending" satisfies DBSchema["users"]["status"])} OR (
          email IS NOT NULL
          AND registration->>'type' IN (${pendingRegistrationTypes.map(escapeLiteral).join(", ")})
          AND registration->'confirmed_on' = 'null'::jsonb
        ) IS TRUE
      )`,
    },
    indexes: {
      "Only one passwordless_admin admin account allowed": {
        unique: true,
        columns: `passwordless_admin`,
        where: `passwordless_admin = true`,
      },
    },
    triggers: {
      validateInvitationUserType: {
        actions: ["insert", "update"],
        type: "before",
        forEach: "row",
        query: `
          BEGIN
            IF NEW.registration->>'type' = '${"invite" satisfies NonNullable<DBSchema["users"]["registration"]>["type"]}'
              AND NEW.type IN ('${USER_TYPES.ADMIN}', '${USER_TYPES.PUBLIC}')
              AND (
                TG_OP = 'INSERT'
                OR OLD.registration->>'confirmed_on' IS NULL
                OR NEW.registration->>'confirmed_on' IS NULL
              )
            THEN
              RAISE EXCEPTION 'This user type cannot be invited';
            END IF;
            RETURN NEW;
          END;
        `,
      },
      updateLastUpdated: {
        actions: ["update"],
        type: "before",
        forEach: "row",
        query: `
          BEGIN
            NEW.last_updated = GREATEST(OLD.last_updated + 1, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);
            RETURN NEW;
          END;
        `,
      },
      atLeastOneActiveAdmin: {
        actions: ["delete", "update"],
        type: "after",
        forEach: "statement",
        query: `
          BEGIN
            IF NOT EXISTS(SELECT * FROM users WHERE type = '${USER_TYPES.ADMIN}' AND status = 'active') THEN
              RAISE EXCEPTION 'Must have at least one active admin user';
            END IF;

            RETURN NULL;
          END;
        `,
      },
    },
  },
} as const satisfies TableConfig<{ en: 1 }>;
