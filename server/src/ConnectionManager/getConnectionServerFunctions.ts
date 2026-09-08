import type { DBSSchema } from "@common/publishUtils";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { ProstglesContext } from "@src/schemaConfig";
import {
  type ServerFunctionDefinition,
  type ServerFunctionDefinitions,
} from "prostgles-server";
import type { OnReadyParams } from "prostgles-server/dist/initProstgles";
import type { DBS } from "..";
import { getEvaledExports } from "./connectionManagerUtils";
import { getAccessRule } from "./startConnection";
import type { ConnectionManager } from "./ConnectionManager";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";

type Args = {
  dbs: DBS;
  databaseConfig: DBSSchema["database_configs"];
  connection: ConnectionHotReloadProperties;
  connectionManager: ConnectionManager;
};

export const getConnectionServerFunctions = async ({
  databaseConfig,
  dbs,
  connection,
  connectionManager,
}: Args) => {
  const connectionFunctions = await dbs.published_methods.find(
    {
      connection_id: connection.id,
    },
    {
      select: {
        "*": 1,
        user_types: {
          $leftJoin: [
            "access_control_methods",
            "access_control",
            "access_control_user_types",
          ],
          select: { user_type: 1 },
        },
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
      new Set<string>([
        "admin",
        ...((m.user_types as null | { user_type: string }[])?.map(
          (r) => r.user_type,
        ) ?? []),
      ]),
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
      run: method,
    };
  });
  // const authContext = await (async () => {
  //   if (!params) return;
  //   const { user } = params;

  //   /** Admin has access to all methods */
  //   if (user?.type === "admin") {
  //     return { ...params, user, type: "admin" as const };
  //   } else {
  //     const accessRule = await getAccessRule(
  //       dbs,
  //       user,
  //       databaseConfig.id,
  //       connection.id,
  //     );
  //     if (accessRule) {
  //       const allowedMethods = await dbs.access_control_methods.find({
  //         access_control_id: accessRule.id,
  //       });
  //       const allowedFunctions = new Set(
  //         allowedMethods.map((m) => m.published_method_id),
  //       );
  //       return {
  //         ...params,
  //         user,
  //         type: "access-rule" as const,
  //         allowedFunctions,
  //       };
  //     }
  //   }
  // })();

  // connectionFunctions.forEach((m) => {
  //   const isAllowedToRunFunction =
  //     authContext?.type === "admin" ||
  //     authContext?.allowedFunctions.has(m.id);
  //   const run =
  //     !isAllowedToRunFunction || !authContext ?
  //       undefined
  //     : async (validatedArgs?: Record<string, unknown>) => {
  //         const user = authContext.user;
  //         const method = getEvaledExports<{
  //           run?: (
  //             args: Record<string, unknown> | undefined,
  //             params: OnReadyParams<void> & { user: typeof user },
  //           ) => Promise<unknown>;
  //         }>(m.run)?.run;
  //         if (!method) throw "Published method must export a run function";

  //         const activeConnection = connectionManager.getActiveConnection(
  //           connection.id,
  //         );
  //         return method(validatedArgs, {
  //           dbo: activeConnection.prgl.db,
  //           db: activeConnection.prgl._db,
  //           sql: activeConnection.prgl.sql,
  //           tables: activeConnection.prgl.getSchema(),
  //           reason: { type: "prgl.restart" },
  //           user,
  //         });
  //       };

  //   result[m.name] = {
  //     input:
  //       !m.arguments.length ?
  //         undefined
  //       : m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
  //     run,
  //   };
  // });

  return publishMethods;
};
