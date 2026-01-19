import type { DBSSchema } from "@common/publishUtils";
import type { SUser } from "@src/authConfig/sessionUtils";
import {
  type ServerFunctionDefinition,
  type ServerFunctionDefinitions,
} from "prostgles-server";
import type { DBS } from "..";
import type { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";
import { getCompiledTS } from "./connectionManagerUtils";
import { getAccessRule } from "./startConnection";

type Args = {
  dbs: DBS;
  dbConf: DBSSchema["database_configs"];
  con: DBSSchema["connections"];
  getForkedProcRunner: () => Promise<ForkedPrglProcRunner>;
};

export const getConnectionServerFunctions = ({
  dbConf,
  dbs,
  con,
  getForkedProcRunner,
}: Args) => {
  const publishMethods: ServerFunctionDefinitions<void, SUser> = async (
    params,
  ) => {
    const result: Record<string, ServerFunctionDefinition> = {};

    const connectionFunctions = await dbs.published_methods.find({
      connection_id: con.id,
    });

    const authContext = await (async () => {
      if (!params) return;
      const { user } = params;

      /** Admin has access to all methods */
      if (user?.type === "admin") {
        return { ...params, user, type: "admin" as const };
      } else {
        const ac = await getAccessRule(dbs, user, dbConf.id, con.id);
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
        (async (validatedArgs) => {
          const sourceCode = getCompiledTS(m.run);

          try {
            const forkedPrglProcRunner = await getForkedProcRunner();
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
        output: "any",
        input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
        run,
      };
    });

    return result;
  };
  return publishMethods;
};
