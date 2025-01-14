import { verifySMTPConfig } from "prostgles-server/dist/Prostgles";
import type {
  Publish,
  PublishParams,
} from "prostgles-server/dist/PublishParser/PublishParser";
import type { ValidateUpdateRow } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import { getKeys } from "prostgles-types";
import { connectionChecker } from ".";
import type { DBGeneratedSchema } from "../../commonTypes/DBGeneratedSchema";
import { isDefined } from "../../commonTypes/filterUtils";
import {
  getMagicLinkEmailFromTemplate,
  getVerificationEmailFromTemplate,
  MOCK_SMTP_HOST,
} from "../../commonTypes/OAuthUtils";
import { getPasswordHash } from "./authConfig/authUtils";
import { getSMTPWithTLS } from "./authConfig/emailProvider/getEmailSenderWithMockTest";
import { getACRules } from "./ConnectionManager/ConnectionManager";
import { fetchLLMResponse } from "./publishMethods/askLLM/askLLM";

export const publish = async (
  params: PublishParams<DBGeneratedSchema>,
): Promise<Publish<DBGeneratedSchema>> => {
  const { dbo: db, user, db: _db, clientReq } = params;

  if (!user || !user.id) {
    return null;
  }
  const isAdmin = user.type === "admin";

  const { id: user_id } = user;

  /** This will prevent admins from seing each others published workspaces?! */
  const accessRules = isAdmin ? undefined : await getACRules(db, user);

  const createEditDashboards =
    isAdmin ||
    accessRules?.some(({ dbsPermissions }) => dbsPermissions?.createWorkspaces);

  const publishedWspIDs =
    accessRules
      ?.flatMap(
        (ac) => ac.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds,
      )
      .filter(isDefined) || [];

  const dashboardMainTables: Publish<DBGeneratedSchema> = (
    ["windows", "links", "workspaces"] as const
  ).reduce(
    (a, tableName) => ({
      ...a,
      [tableName]: {
        select: {
          fields: "*",
          forcedFilter: {
            $or: [
              { user_id },
              /** User either owns the item or the item has been shared/published to the user */
              {
                [tableName === "workspaces" ? "id" : "workspace_id"]: {
                  $in: publishedWspIDs,
                },
              },
            ],
          },
        },
        sync: {
          id_fields: ["id"],
          synced_field: "last_updated",
        },
        ...(createEditDashboards && {
          update: {
            fields: { user_id: 0 },
            forcedData: { user_id },
            forcedFilter: { user_id },
          },
          insert: {
            fields: "*",
            forcedData: { user_id },
            /** TODO: Add workspace publish modes */
            checkFilter:
              tableName === "workspaces" ? undefined : (
                {
                  $existsJoined: {
                    workspaces: {
                      user_id: user.id,
                    },
                  },
                }
              ),
          },
          delete: {
            filterFields: "*",
            forcedFilter: { user_id },
          },
        }),
      },
    }),
    {},
  );

  type User = DBGeneratedSchema["users"]["columns"];
  const getValidateAndHashUserPassword = (mustUpdate = false) => {
    const validateFunc: ValidateUpdateRow<User, DBGeneratedSchema> = async ({
      dbx,
      filter,
      update,
    }) => {
      if ("password" in update) {
        //@ts-ignore
        const [user, ...otherUsers] = await dbx.users.find(filter);
        if (!user || otherUsers.length) {
          throw "Cannot update: update filter must match exactly one user";
        }
        if (!update.password) {
          throw "Password cannot be empty";
        }
        const hashedPassword = getPasswordHash(user, update.password);
        if (typeof hashedPassword !== "string") throw "Not ok";
        if (mustUpdate) {
          await dbx.users.update(filter, { password: hashedPassword });
        }
        return {
          ...update,
          password: hashedPassword,
        };
      }
      update.last_updated ??= Date.now().toString();
      return update;
    };
    return validateFunc;
  };

  const userTypeFilter = {
    access_control_user_types: { user_type: user.type },
  };

  const forcedData = { user_id: user.id };
  const forcedFilter = { user_id: user.id };

  const forcedFilterLLM = {
    $existsJoined: {
      access_control_allowed_llm: {
        access_control_id: { $in: accessRules?.map((ac) => ac.id) ?? [] },
      },
    },
  };

  let dashboardTables: Publish<DBGeneratedSchema> = {
    /* DASHBOARD */
    ...(dashboardMainTables as object),
    access_control_user_types: isAdmin && "*",
    credentials: isAdmin && {
      select: {
        fields: { key_secret: 0 },
      },
      delete: "*",
      insert: {
        fields: { id: 0 },
        forcedData,
      },
      update: "*",
    },
    llm_credentials: {
      select: {
        fields: isAdmin ? "*" : { id: 1, name: 1, is_default: 1 },
        forcedFilter: isAdmin ? undefined : forcedFilterLLM,
      },
      delete: isAdmin && "*",
      insert: isAdmin && {
        fields: "*",
        forcedData,
        postValidate: async ({ row }) => {
          await fetchLLMResponse({
            llm_credential: row,
            messages: [
              { role: "system", content: "Be helpful" },
              { role: "user", content: "Hey" },
            ],
          });
        },
      },
      update: isAdmin && {
        fields: { created: 0 },
      },
    },
    llm_prompts: {
      select:
        isAdmin ? "*" : (
          {
            fields: { id: 1, name: 1 },
            forcedFilter: forcedFilterLLM,
          }
        ),
      delete: isAdmin && "*",
      insert: isAdmin && {
        fields: "*",
        forcedData,
      },
      update: isAdmin && {
        fields: "*",
        forcedFilter,
        forcedData,
      },
    },
    llm_chats: {
      select: {
        fields: "*",
        forcedFilter,
      },
      delete: isAdmin && "*",
      insert: {
        fields: "*",
        forcedData,
      },
      update: {
        fields: { created: 0, user_id: 0 },
        forcedData,
        forcedFilter,
      },
    },
    llm_messages: {
      select: {
        fields: "*",
        forcedFilter: {
          $existsJoined: {
            llm_chats: {
              user_id: user.id,
            },
          },
        },
      },
      delete: isAdmin && "*",
      insert: {
        fields: "*",
        forcedData,
        checkFilter: {
          $existsJoined: {
            llm_chats: {
              user_id: user.id,
            },
          },
        },
      },
      update: isAdmin && {
        fields: "*",
        forcedData,
        forcedFilter,
      },
    },
    credential_types: isAdmin && { select: "*" },
    access_control: isAdmin ? "*" : undefined, // { select: { fields: "*", forcedFilter: { $existsJoined: userTypeFilter } } },
    database_configs:
      isAdmin ? "*" : (
        {
          select: { fields: { id: 1 } },
        }
      ),
    connections: {
      select: {
        fields: isAdmin ? "*" : { id: 1, name: 1, created: 1 },
        orderByFields: { db_conn: 1, created: 1 },
        forcedFilter:
          isAdmin ?
            {}
          : {
              $and: [
                {
                  $existsJoined: {
                    "database_configs.access_control.access_control_user_types":
                      userTypeFilter["access_control_user_types"],
                  } as any,
                },
                { $existsJoined: { access_control_connections: {} } },
              ],
            },
      },
      update: user.type === "admin" && {
        fields: {
          name: 1,
          url_path: 1,
          table_options: 1,
        },
      },
    },
    user_types: isAdmin && {
      insert: "*",
      select: {
        fields: "*",
      },
      delete: {
        filterFields: "*",
        validate: async (filter) => {
          const adminVal = await db.user_types.findOne({
            $and: [filter ?? {}, { id: "admin" }],
          });
          if (adminVal) throw "Cannot delete the admin value";
        },
      },
    },
    users:
      isAdmin ?
        {
          select: { fields: { "2fa": 0, password: 0 } },
          insert: {
            fields: { created: 0, "2fa": 0, last_updated: 0 },
            postValidate: async ({ row, dbx, localParams }) => {
              await getValidateAndHashUserPassword(true)({
                localParams,
                update: row,
                dbx,
                filter: { id: row.id },
              });
            },
          },
          update: {
            fields: {
              options: 1,
            },
            validate: getValidateAndHashUserPassword(),
            dynamicFields: [
              {
                /* For own user can only change these fields */
                fields: { username: 1, password: 1, status: 1, options: 1 },
                filter: { id: user.id },
              },
            ],
          },
          delete: {
            filterFields: "*",
            forcedFilter: { "id.<>": user.id }, // Cannot delete your admin user
          },
        }
      : {
          select: {
            fields: {
              id: 1,
              username: 1,
              name: 1,
              email: 1,
              auth_provider: 1,
              type: 1,
              options: 1,
              created: 1,
            },
            forcedFilter: { id: user_id },
          },
          update: {
            fields: { password: 1, options: 1 },
            forcedFilter: { id: user_id },
            validate: getValidateAndHashUserPassword(),
          },
        },
    sessions: {
      delete:
        isAdmin ? "*" : (
          {
            filterFields: "*",
            forcedFilter: { user_id },
          }
        ),
      select: {
        fields: { id: 0 },
        forcedFilter: isAdmin ? undefined : { user_id },
      },
      update:
        isAdmin ? "*" : (
          {
            fields: { active: 1 },
            forcedFilter: { user_id, active: true },
          }
        ),
    },
    backups: {
      select: true,
      update: isAdmin && {
        fields: ["restore_status"],
      },
    },
    magic_links: isAdmin && {
      insert: {
        fields: { magic_link: 0, magic_link_used: 0 },
      },
      select: true,
      update: true,
      delete: true,
    },

    login_attempts: {
      select: "*",
    },

    global_settings: isAdmin && {
      select: "*",
      update: {
        fields: {
          allowed_origin: 1,
          allowed_ips: 1,
          trust_proxy: 1,
          allowed_ips_enabled: 1,
          session_max_age_days: 1,
          login_rate_limit: 1,
          login_rate_limit_enabled: 1,
          pass_process_env_vars_to_server_side_functions: 1,
          enable_logs: 1,
          auth_providers: 1,
          prostgles_registration: 1,
        },
        postValidate: async ({ row, dbx: dbsTX }) => {
          if (!row.allowed_ips.length) {
            throw "Must include at least one allowed IP CIDR";
          }
          // const ranges = await Promise.all(
          //   row.allowed_ips?.map(
          //     cidr => db.sql!(
          //       getCIDRRangesQuery({ cidr, returns: ["from", "to"] }),
          //       { cidr },
          //       { returnType: "row" }
          //     )
          //   )
          // )

          if (row.allowed_ips_enabled) {
            const { isAllowed, ip } = await connectionChecker.checkClientIP({
              ...clientReq,
              dbsTX,
            });
            if (!isAllowed)
              throw `Cannot update to a rule that will block your current IP.  \n Must allow ${ip} within Allowed IPs`;
          }

          const { email } = row.auth_providers ?? {};
          if (
            email?.enabled &&
            !(email.smtp.type === "smtp" && email.smtp.host === MOCK_SMTP_HOST)
          ) {
            const smtp = getSMTPWithTLS(email.smtp);
            await verifySMTPConfig(smtp);
          }

          if (email?.signupType === "withPassword") {
            getVerificationEmailFromTemplate({
              template: email.emailTemplate,
              url: "a",
              code: "a",
            });
          }
          if (email?.signupType === "withMagicLink") {
            getMagicLinkEmailFromTemplate({
              template: email.emailTemplate,
              url: "a",
              code: "a",
            });
          }

          return undefined;
        },
      },
    },
  };

  const curTables = Object.keys(dashboardTables);
  const remainingTables = getKeys(db).filter((k) => {
    const tableHandler = db[k];
    return tableHandler && "find" in tableHandler && !curTables.includes(k);
  });
  const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
  dashboardTables = {
    ...(dashboardTables as object),
    ...(isAdmin ? adminExtra : {}),
  };

  return dashboardTables;
};
