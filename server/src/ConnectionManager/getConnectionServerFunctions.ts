import { USER_TYPES } from "@common/authTypesAndConstants";
import type { DBSSchema } from "@common/publishUtils";
import type { FunctionOptions } from "@common/functionOptions";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { ProstglesContext } from "@src/schemaConfig";
import {
  getConnectionInviteUserTypeFilter,
  getUserInviteFunctions,
  userInviteFunctionOptions,
} from "@src/serverFunctions/userInviteFunctions";
import { defineJoin, type ServerFunctionDefinitions } from "prostgles-server";
import { getKeys } from "prostgles-types";
import type { DBS } from "..";
import { getEvaledExports } from "./connectionManagerUtils";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";
import { getSchemaConfig } from "./getSchemaConfig";

type Args = {
  dbs: DBS;
  databaseConfig: DBSSchema["database_configs"];
  connection: ConnectionHotReloadProperties;
};

export const getConnectionServerFunctions = async ({
  databaseConfig,
  dbs,
  connection,
}: Args) => {
  const schemaConfig = getSchemaConfig(databaseConfig.config_sync)?.config;
  const syncUsers =
    schemaConfig?.databaseConfig?.sync_users ?? databaseConfig.sync_users;
  const inviteUserTypes =
    syncUsers && !connection.is_state_db ?
      await dbs.user_types.find(
        {
          id: { $nin: [USER_TYPES.ADMIN, USER_TYPES.PUBLIC] },
          ...getConnectionInviteUserTypeFilter(connection.id),
        },
        {
          select: { id: 1 },
          returnType: "values",
          orderBy: { id: 1 },
          limit: null,
        },
      )
    : [];
  const connectionFunctions = await dbs.published_methods.find(
    {
      connection_id: connection.id,
    },
    {
      select: {
        "*": 1,
        user_types: defineJoin({
          $leftJoin: [
            "access_control_methods",
            "access_control",
            "access_control_user_types",
          ],
          select: { user_type: 1 },
        }),
      },
    },
  );
  const publishMethods: ServerFunctionDefinitions<
    void,
    SUser,
    ProstglesContext
  > = {};

  /** Combine all userFilter with admin into unique groups */
  connectionFunctions.forEach((m) => {
    const userTypesList = Array.from(
      new Set([USER_TYPES.ADMIN, ...m.user_types.map((r) => r.user_type)]),
    ).toSorted();
    const userFilter = {
      type: { $in: userTypesList },
    };
    const groupName = userTypesList.join(",");
    publishMethods[groupName] ??= {
      userFilter,
      functions: {},
    };
    const method = getEvaledExports<{
      run: (
        args: Record<string, unknown> | undefined,
        params: unknown,
      ) => Promise<unknown>;
    }>(m.run)!.run;
    publishMethods[groupName].functions[m.name] = {
      input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
      description: m.description,
      run: method,
    };
  });

  if (inviteUserTypes.length) {
    if (schemaConfig?.functions?.userInvites) {
      throw new Error(
        'Function group "userInvites" conflicts with built-in invitations',
      );
    }
    for (const functionName of getKeys(userInviteFunctionOptions)) {
      if (
        Object.values(schemaConfig?.functions ?? {}).some(
          (group) => group.functions[functionName],
        ) ||
        connectionFunctions.some((method) => method.name === functionName)
      ) {
        throw new Error(
          `Function "${functionName}" conflicts with built-in invitations`,
        );
      }
    }
  }

  return {
    functions: {
      ...schemaConfig?.functions,
      /** Connection-managed functions retain precedence on name collisions. */
      ...publishMethods,
      ...(inviteUserTypes.length &&
        getUserInviteFunctions({
          dbs,
          id: connection.id,
          userTypes: inviteUserTypes,
        })),
    } as ServerFunctionDefinitions<void, SUser, ProstglesContext>,
    functionOptions: {
      ...(inviteUserTypes.length && userInviteFunctionOptions),
      ...Object.fromEntries(
        connectionFunctions.map((method) => [
          method.name,
          {
            defaultArgs: Object.fromEntries(
              method.arguments
                .filter((argument) => argument.defaultValue !== undefined)
                .map((argument) => [argument.name, argument.defaultValue]),
            ),
            ...(method.outputTable && { outputTable: method.outputTable }),
          } satisfies FunctionOptions,
        ]),
      ),
    },
  };
};
