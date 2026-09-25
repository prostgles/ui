import type { DBSSchema } from "@common/publishUtils";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { ProstglesContext } from "@src/schemaConfig";
import { defineJoin, type ServerFunctionDefinitions } from "prostgles-server";
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
      new Set(["admin", ...m.user_types.map((r) => r.user_type)]),
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

  return {
    ...getSchemaConfig(databaseConfig.config_sync)?.config.functions,
    /** Connection-managed functions retain precedence on name collisions. */
    ...publishMethods,
  } as ServerFunctionDefinitions<void, SUser, ProstglesContext>;
};
