import {
  canManageBusinessAccess,
  MANAGED_USER_TYPES,
  USER_TYPES,
} from "@common/authTypesAndConstants";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { isDefined } from "@common/filterUtils";
import {
  getMagicLinkEmailFromTemplate,
  getVerificationEmailFromTemplate,
  MOCK_SMTP_HOST,
} from "@common/OAuthUtils";
import type { DBSSchema } from "@common/publishUtils";
import { isPortFree } from "@src/utils/isPortFree";
import type { SessionUser } from "prostgles-server/dist/Auth/AuthTypes";
import type { PublishFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import { verifySMTPConfig } from "prostgles-server/dist/Prostgles";
import type { Publish } from "prostgles-server/dist/PublishParser/PublishParser";
import { getKeys, type FullFilter } from "prostgles-types";
import { getSMTPWithTLS } from "../authConfig/emailProvider/getEmailSenderWithMockTest";
import { checkClientIP } from "../authConfig/sessionUtils";
import { fetchUserAccessControlRules } from "../ConnectionManager/fetchUserAccessControlRules";
import { getAllowedConnectionsFilter } from "./getAllowedConnectionsFilter";
import { getBusinessAccessPublish } from "./getBusinessAccessPublish";
import { getPublishLLM } from "./getPublishLLM";

export const publish: Publish<
  DBGeneratedSchema,
  SessionUser<DBSSchema["users"]>
> = async (params) => {
  const { dbo: db, user, db: _db, clientReq, sid } = params;

  if (!user || !user.id) {
    return null;
  }
  const isAdmin = user.type === USER_TYPES.ADMIN;

  const { id: user_id } = user;
  const allowedConnectionFilter: FullFilter<
    DBSSchema["connections"],
    DBGeneratedSchema
  > = isAdmin ? {} : getAllowedConnectionsFilter(user.type, []);
  const getDashboardConnectionFilter = (
    tableName: "workspaces" | "windows" | "links",
  ) =>
    isAdmin ?
      {}
    : getAllowedConnectionsFilter(
        user.type,
        tableName === "workspaces" ?
          ["connections"]
        : ["workspaces", "connections"],
      );

  const accessRules =
    isAdmin ? undefined : await fetchUserAccessControlRules(db, user);

  const createEditDashboards =
    isAdmin ||
    accessRules?.some(({ dbsPermissions }) => dbsPermissions?.createWorkspaces);

  const publishedWspIDs =
    accessRules
      ?.flatMap(
        (ac) => ac.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds,
      )
      .filter(isDefined) || [];

  const getDashboardEditFilter = (
    tableName: "workspaces" | "windows" | "links",
  ) =>
    !isAdmin ?
      { $and: [{ user_id }, getDashboardConnectionFilter(tableName)] }
    : {
        $or: [
          { user_id },
          tableName === "workspaces" ?
            { published: true }
          : { $existsJoined: { workspaces: { published: true } } },
        ],
      };

  const dashboardMainTables: Publish<DBGeneratedSchema> = (
    ["windows", "links", "workspaces"] as const
  ).reduce(
    (a, tableName) => ({
      ...a,
      [tableName]: {
        select: {
          fields: "*",
          forcedFilter: {
            $and: [
              ...(isAdmin ? [] : [getDashboardConnectionFilter(tableName)]),
              {
                $or: [
                  { user_id },
                  /** User either owns the item or the item has been shared/published to the user */
                  canManageBusinessAccess(user.type) ?
                    tableName === "workspaces" ?
                      { published: true }
                    : { $existsJoined: { workspaces: { published: true } } }
                  : {
                      [tableName === "workspaces" ? "id" : "workspace_id"]: {
                        $in: publishedWspIDs,
                      },
                    },
                ],
              },
            ],
          },
        },
        ...(createEditDashboards && {
          update: {
            fields: { user_id: 0 },
            forcedData: isAdmin ? undefined : { user_id },
            forcedFilter: getDashboardEditFilter(tableName),
            checkFilter:
              isAdmin ? undefined : getDashboardConnectionFilter(tableName),
          },
          insert: {
            fields: "*",
            forcedData: { user_id },
            /** TODO: Add workspace publish modes */
            checkFilter:
              tableName === "workspaces" ?
                isAdmin ? undefined
                : getDashboardConnectionFilter(tableName)
              : {
                  $existsJoined: {
                    workspaces: getDashboardEditFilter("workspaces"),
                  },
                },
          },
          delete: {
            filterFields: "*",
            forcedFilter: getDashboardEditFilter(tableName),
          },
        }),
      } satisfies PublishFullyTyped<DBGeneratedSchema>["workspaces"],
    }),
    {},
  );

  const forcedData = { user_id: user.id };

  // const forcedFilterLLM = {
  //   $existsJoined: {
  //     access_control_allowed_llm: {
  //       access_control_id: { $in: accessRules?.map((ac) => ac.id) ?? [] },
  //     },
  //   },
  // };

  let dashboardTables: Publish<DBGeneratedSchema> = {
    /* DASHBOARD */
    ...dashboardMainTables,
    access_control_user_types: isAdmin && "*",
    access_control_connections: isAdmin && "*",
    published_methods:
      isAdmin ? "*" : (
        {
          select: {
            fields: {
              id: 1,
              name: 1,
              description: 1,
              arguments: 1,
              connection_id: 1,
            },
          },
        }
      ),
    credentials: isAdmin && {
      select: {
        fields: { key_secret: 0 },
      },
      delete: "*",
      insert: {
        fields: { id: 0 },
        forcedData,
        postValidate: ({ row }) => {
          if (row.type !== "AWS" && !row.endpoint_url) {
            throw "Endpoint URL is required for non-AWS credentials";
          }
        },
      },
      update: "*",
    },
    ...getPublishLLM(user_id, isAdmin, accessRules),
    credential_types: isAdmin && { select: "*" },
    access_control: isAdmin && "*",
    database_configs:
      isAdmin ?
        {
          select: "*",
          update: {
            fields: "*",

            postValidate: async ({ row, dbx: dbsTX, tx }) => {
              if (row.allowed_ips_enabled && !row.allowed_ips.length) {
                throw "Must include at least one allowed IP CIDR";
              }

              if (row.allowed_ips_enabled) {
                const oldValue = await dbsTX.database_configs.findOne({
                  id: row.id,
                });
                if (!oldValue) {
                  throw "Cannot find existing database config to validate IP changes";
                }

                if (!clientReq.httpReq && !clientReq.socket) {
                  throw "Cannot determine client IP for validation";
                }

                const { isAllowed, ip } = await checkClientIP(
                  tx,
                  {
                    ...clientReq,
                  },
                  oldValue,
                );
                if (!isAllowed) {
                  throw `Cannot update to a rule that will block your current IP.  \n Must allow ${ip} within Allowed IPs`;
                }
              }

              const { email } = row.auth_providers ?? {};
              if (
                email?.enabled &&
                (email.smtp.type !== "smtp" ||
                  email.smtp.host !== MOCK_SMTP_HOST)
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
          insert: "*",
          delete: "*",
        }
      : {
          select: { fields: { id: 1, table_schema_positions: 1 } },
        },
    connections: {
      select: {
        fields:
          isAdmin ? "*" : (
            { id: 1, name: 1, created: 1, is_state_db: 1, table_options: 1 }
          ),
        orderByFields: { db_conn: 1, created: 1 },
        forcedFilter: allowedConnectionFilter,
      },
      update: isAdmin && {
        fields: {
          name: 1,
          url_path: 1,
          table_options: 1,
          function_options: 1,
          db_schema_filter: 1,
          display_options: 1,
          port: 1,
          web_app_directory: 1,
        },
        postValidate: async ({ row, data: update, command }) => {
          if (command !== "update") return;
          if (update.port && row.port) {
            const isFree = await isPortFree(row.port);
            if (!isFree) {
              throw `Port ${row.port} is already in use`;
            }
          }

          if (row.is_state_db && update.table_options) {
            throw "Table options cannot be set on state database connections";
          }
        },
      },
    },
    user_types: {
      select: {
        fields: "*",
        forcedFilter:
          canManageBusinessAccess(user.type) ? {} : { id: user.type },
      },
      ...(canManageBusinessAccess(user.type) && {
        insert: {
          fields: ["id", "description"],
          checkFilter: { id: { $nin: MANAGED_USER_TYPES } },
        },
        update: {
          fields: ["description"],
          forcedFilter: { id: { $nin: MANAGED_USER_TYPES } },
        },
        delete: {
          filterFields: "*",
          forcedFilter: { id: { $nin: MANAGED_USER_TYPES } },
        },
      }),
    },
    users:
      isAdmin ?
        {
          select: { fields: { "2fa": 0, password: 0 } },
          insert: {
            fields: { created: 0, "2fa": 0, last_updated: 0 },
          },
          update: {
            fields: {
              username: 1,
              name: 1,
              email: 1,
              type: 1,
              status: 1,
              options: 1,
            },
            dynamicFields: [
              {
                /* For own user can only change these fields */
                fields: { username: 1, status: 1, options: 1 },
                filter: { id: user.id },
              },
            ],
          },
          delete: {
            filterFields: "*",
            forcedFilter: { id: { "<>": user.id } }, // Cannot delete your admin user
          },
        }
      : {
          select: {
            fields: {
              id: 1,
              type: 1,
              username: 1,
              name: 1,
              status: 1,
              email: 1,
              auth_provider: 1,
              options: 1,
              created: 1,
            },
            forcedFilter: { id: user_id },
          },
          update: {
            fields: { options: 1 },
            forcedFilter: { id: user_id },
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
      select: {
        fields: "*",
        forcedFilter:
          isAdmin ? undefined : { $or: [{ username: user.username }, { sid }] },
      },
    },
    logs: isAdmin && {
      select: "*",
    },
    global_settings: isAdmin && {
      select: "*",
      update: {
        fields: {
          prostgles_registration: 1,
          mcp_servers_disabled: 1,
        },
      },
    },
    services:
      isAdmin ? "*" : (
        {
          select: {
            fields: {
              name: 1,
              status: 1,
              icon: 1,
              label: 1,
              description: 1,
            },
          },
        }
      ),
  };

  if (user.type === USER_TYPES.CONNECTION_ADMIN) {
    dashboardTables = {
      ...dashboardTables,
      ...getBusinessAccessPublish(user_id),
    };
  }

  const curTables = Object.keys(dashboardTables);
  const remainingTables = getKeys(db).filter((k) => {
    const tableHandler = db[k];
    return "find" in tableHandler && !curTables.includes(k);
  });
  const adminExtra = remainingTables.reduce((a, v) => ({ ...a, [v]: "*" }), {});
  dashboardTables = {
    ...(dashboardTables as object),
    ...(isAdmin ? adminExtra : {}),
  };

  return dashboardTables;
};
