import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema } from "@common/publishUtils";
import type { FullFilter } from "prostgles-types";
import { canManageBusinessAccess } from "@common/authTypesAndConstants";

// Exclude the state database and connections using the same database config.
const nonStateDbConnectionsFilter = {
  $notExistsJoined: {
    path: ["database_configs", "connections"],
    filter: { is_state_db: true },
  },
} as const satisfies FullFilter<DBSSchema["connections"], DBGeneratedSchema>;

export const getAllowedConnectionsFilter = (
  userType: string,
  connectionPath: [] | ["connections"] | ["workspaces", "connections"],
) => ({
  $and: [
    {
      $notExistsJoined: {
        path: [
          ...connectionPath,
          ...nonStateDbConnectionsFilter.$notExistsJoined.path,
        ],
        filter: { is_state_db: true },
      },
    },
    ...(canManageBusinessAccess(userType) ?
      []
    : [
        {
          $existsJoined: {
            path: [
              ...connectionPath,
              "access_control_connections",
              "access_control",
              "access_control_user_types",
            ],
            filter: { user_type: userType },
          },
        },
      ]),
  ],
});

export const nonStateDbAccessRuleFilter = {
  $and: [
    { $existsJoined: { access_control_connections: {} } },
    nonStateDbConnectionsFilter,
    /*
     * Also exclude links to the state database or its aliases. The schema allows
     * linked connections to use a different database from the rule's database_id.
     */
    {
      $notExistsJoined: {
        path: [
          "access_control_connections",
          "connections",
          "database_configs",
          "connections",
        ],
        filter: { is_state_db: true },
      },
    },
  ],
} as const satisfies FullFilter<DBSSchema["access_control"], DBGeneratedSchema>;

export const nonStateDbNonRunSqlAccessRuleFilter = {
  $and: [
    ...nonStateDbAccessRuleFilter.$and,
    {
      $or: [
        { dbPermissions: { "@>": { type: "Custom" } } },
        { dbPermissions: { "@>": { type: "All views/tables" } } },
      ],
    },
  ],
} as const satisfies FullFilter<DBSSchema["access_control"], DBGeneratedSchema>;

// Protect SQL grants through user-type assignment as well as rule editing.
export const getUserTypeWithoutSQLFilter = (userTypePath: string[]) =>
  ({
    $notExistsJoined: {
      path: [...userTypePath, "access_control_user_types", "access_control"],
      filter: {
        dbPermissions: { "@>": { type: "Run SQL", allowSQL: true } },
      },
    },
  }) as const;
