import type { DBSSchema } from "@common/publishUtils";
import type { SUser } from "@src/authConfig/sessionUtils";
import {
  type ServerFunctionDefinition,
  type ServerFunctionDefinitions,
} from "prostgles-server";
import type { DBS } from "..";
import { getCompiledTS } from "./connectionManagerUtils";
import { getAccessRule } from "./startConnection";
import type { ConnectionManager } from "./ConnectionManager";
import type { ConnectionDetails } from "@src/connectionUtils/getConnectionDetails";
import { getConnectionFunctionRunner } from "./getConnectionFunctionRunner";

type Args = {
  dbs: DBS;
  databaseConfig: DBSSchema["database_configs"];
  connection: DBSSchema["connections"];
  connectionManager: ConnectionManager;
  connectionInfo: ConnectionDetails;
};

export const getConnectionServerFunctions = async ({
  databaseConfig,
  dbs,
  connection,
  connectionManager,
  connectionInfo,
}: Args) => {
  const connectionFunctions = await dbs.published_methods.find({
    connection_id: connection.id,
  });
  const publishMethods: ServerFunctionDefinitions<void, SUser> = async (
    params,
  ) => {
    const result: Record<string, ServerFunctionDefinition> = {};

    const authContext = await (async () => {
      if (!params) return;
      const { user } = params;

      /** Admin has access to all methods */
      if (user?.type === "admin") {
        return { ...params, user, type: "admin" as const };
      } else {
        const ac = await getAccessRule(
          dbs,
          user,
          databaseConfig.id,
          connection.id,
        );
        if (ac) {
          const allowedMethods = await dbs.access_control_methods.find({
            access_control_id: ac.id,
          });
          const allowedFunctions = new Set(
            allowedMethods.map((m) => m.published_method_id),
          );
          return {
            ...params,
            user,
            type: "access-rule" as const,
            allowedFunctions,
          };
        }
      }
    })();

    connectionFunctions.forEach((m) => {
      const run =
        authContext &&
        (async (validatedArgs?: Record<string, unknown>) => {
          const sourceCode = getCompiledTS(m.run);

          try {
            const forkedPrglProcRunner = await getConnectionFunctionRunner({
              dbs,
              connection,
              connectionManager,
              databaseConfig,
              connectionInfo,
            }).catch((err) => {
              console.error(
                "Error getting function runner for connection function",
                err,
              );
              return Promise.reject("Error setting up function runner");
            });
            return forkedPrglProcRunner.run({
              type: "run",
              code: sourceCode,
              validatedArgs,
              user: authContext.user,
            });
          } catch (err: any) {
            return Promise.reject(err);
          }
        });

      result[m.name] = {
        input:
          !m.arguments.length ?
            undefined
          : m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
        run,
      };
    });

    return result;
  };
  return publishMethods;
};
