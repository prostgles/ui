import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import type { DBHandlerServer } from "prostgles-server";
import type { PublishFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import { fetchUserAccessControlRules } from "../ConnectionManager/fetchUserAccessControlRules";
import {
  nonStateDbNonRunSqlAccessRuleFilter,
  getUserTypeWithoutSQLFilter,
} from "./getAllowedConnectionsFilter";

export const getBusinessAccessPublish = (userId: string) => {
  const relatedRuleFilter = {
    $existsJoined: { access_control: nonStateDbNonRunSqlAccessRuleFilter },
  } as const;

  const editableUserFilter = {
    type: { $nin: [USER_TYPES.ADMIN, USER_TYPES.PUBLIC] },
    ...getUserTypeWithoutSQLFilter(["user_types"]),
  };

  return {
    access_control: {
      select: {
        fields: "*",
        forcedFilter: nonStateDbNonRunSqlAccessRuleFilter,
      },
      insert: {
        fields: [
          "database_id",
          "name",
          "dbPermissions",
          "dbsPermissions",
          "llm_daily_limit",
        ],
        requiredNestedInserts: [
          { ftable: "access_control_connections", minRows: 1, maxRows: 1 },
        ],
      },
      update: {
        fields: {
          name: 1,
          dbPermissions: 1,
          dbsPermissions: 1,
          llm_daily_limit: 1,
        },
        forcedFilter: nonStateDbNonRunSqlAccessRuleFilter,
        checkFilter: nonStateDbNonRunSqlAccessRuleFilter,
        postValidate: ({ row, dbx }) =>
          validateBusinessRuleWorkspaces(row, dbx),
      },
      delete: {
        filterFields: "*",
        forcedFilter: nonStateDbNonRunSqlAccessRuleFilter,
      },
    },
    access_control_connections: {
      select: { fields: "*", forcedFilter: relatedRuleFilter },
      insert: {
        fields: ["access_control_id", "connection_id"],
        allowedNestedInserts: [
          { table: "access_control", column: "access_control_id" },
        ],
        postValidate: async ({ row, dbx }) => {
          const rule = await dbx.access_control.findOne({
            $and: [
              { id: row.access_control_id },
              nonStateDbNonRunSqlAccessRuleFilter,
              {
                $existsJoined: {
                  path: ["database_configs", "connections"],
                  filter: { id: row.connection_id },
                },
              },
            ],
          });
          if (!rule) {
            throw new Error("Rule must belong to the linked business database");
          }
          await validateBusinessRuleWorkspaces(rule, dbx);
        },
      },
    },
    access_control_user_types: {
      select: { fields: "*", forcedFilter: relatedRuleFilter },
      insert: {
        fields: ["access_control_id", "user_type"],
        checkFilter: relatedRuleFilter,
      },
      delete: { filterFields: "*", forcedFilter: relatedRuleFilter },
    },
    access_control_methods: {
      select: { fields: "*", forcedFilter: relatedRuleFilter },
      insert: {
        fields: ["access_control_id", "published_method_id"],
        checkFilter: relatedRuleFilter,
        postValidate: async ({ row, dbx }) => {
          const method = await dbx.published_methods.findOne({
            id: row.published_method_id,
            $existsJoined: {
              path: ["connections", "access_control_connections"],
              filter: { access_control_id: row.access_control_id },
            },
          });
          if (!method)
            throw new Error(
              "Function must belong to a connection using this rule",
            );
        },
      },
      delete: { filterFields: "*", forcedFilter: relatedRuleFilter },
    },
    access_control_allowed_llm: {
      select: { fields: "*", forcedFilter: relatedRuleFilter },
      insert: {
        fields: ["access_control_id", "llm_credential_id", "llm_prompt_id"],
        checkFilter: relatedRuleFilter,
        preValidate: async ({ row, dbx }) => {
          const accessRules = await fetchUserAccessControlRules(dbx, {
            id: userId,
            type: USER_TYPES.CONNECTION_ADMIN,
          });
          const allowedGrantFilter = {
            access_control_id: { $in: accessRules.map(({ id }) => id) },
          };
          const credentialGrant = await dbx.access_control_allowed_llm.findOne({
            ...allowedGrantFilter,
            llm_credential_id: row.llm_credential_id,
          });
          const promptGrant = await dbx.access_control_allowed_llm.findOne({
            ...allowedGrantFilter,
            llm_prompt_id: row.llm_prompt_id,
          });
          if (!credentialGrant || !promptGrant) {
            throw new Error(
              "Only granted AI credentials and prompts can be delegated",
            );
          }
          return row;
        },
      },
      delete: { filterFields: "*", forcedFilter: relatedRuleFilter },
    },
    published_methods: {
      select: {
        fields: {
          id: 1,
          name: 1,
          description: 1,
          arguments: 1,
          connection_id: 1,
        },
        forcedFilter: {
          $notExistsJoined: {
            path: ["connections", "database_configs", "connections"],
            filter: { is_state_db: true },
          },
        },
      },
    },
    users: {
      select: {
        fields: {
          id: 1,
          type: 1,
          username: 1,
          name: 1,
          status: 1,
          email: 1,
          options: 1,
          created: 1,
        },
        forcedFilter: { $or: [{ id: userId }, editableUserFilter] },
      },
      insert: {
        fields: { username: 1, password: 1, name: 1, email: 1, type: 1 },
        forcedData: { status: "active" },
        checkFilter: editableUserFilter,
      },
      update: {
        fields: { type: 1, name: 1, status: 1 },
        forcedFilter: editableUserFilter,
        checkFilter: editableUserFilter,
        dynamicFields: [
          {
            filter: { id: userId },
            fields: { type: 1, name: 1, status: 1, options: 1 },
          },
        ],
      },
      delete: {
        filterFields: "*",
        forcedFilter: { ...editableUserFilter, id: { $ne: userId } },
      },
    },
  } satisfies PublishFullyTyped<DBGeneratedSchema>;
};

export const validateBusinessRuleWorkspaces = async (
  rule: DBSSchema["access_control"],
  dbs: Pick<DBHandlerServer<DBGeneratedSchema>, "workspaces">,
) => {
  const workspaceIds = [
    ...new Set(
      rule.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds ?? [],
    ),
  ];
  if (!workspaceIds.length) return;
  const allowedCount = await dbs.workspaces.count({
    id: { $in: workspaceIds },
    published: true,
    $existsJoined: {
      path: ["connections", "access_control_connections"],
      filter: { access_control_id: rule.id },
    },
  });
  if (allowedCount !== workspaceIds.length) {
    throw new Error(
      "Published workspaces must belong to connections using this rule",
    );
  }
};
