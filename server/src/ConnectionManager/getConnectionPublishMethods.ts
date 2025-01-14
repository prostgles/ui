import type { PublishMethods } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import type { SUser } from "../authConfig/getAuth";
import {
  omitKeys,
  pickKeys,
  type AnyObject,
  type MethodFullDef,
} from "prostgles-types";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { getCompiledTS } from "./connectionManagerUtils";
import { getACRule } from "./startConnection";
import type { DBS } from "..";
import type { JSONBColumnDef } from "prostgles-server/dist/TableConfig/TableConfig";
import type { DB } from "prostgles-server/dist/initProstgles";
import type { ForkedPrglProcRunner } from "./ForkedPrglProcRunner";

type Args = {
  dbs: DBS;
  dbConf: DBSSchema["database_configs"];
  con: DBSSchema["connections"];
  _dbs: DB;
  getForkedProcRunner: () => Promise<ForkedPrglProcRunner>;
};

export const getConnectionPublishMethods = ({
  dbConf,
  dbs,
  con,
  _dbs,
  getForkedProcRunner,
}: Args): PublishMethods<void, SUser> => {
  const publishMethods: PublishMethods<void, SUser> = async ({ user }) => {
    const result: Record<string, MethodFullDef> = {};

    /** Admin has access to all methods */
    let allowedMethods: DBSSchema["published_methods"][] = [];
    if (user?.type === "admin") {
      allowedMethods = await dbs.published_methods.find({
        connection_id: con.id,
      });
    } else {
      const ac = await getACRule(dbs, user, dbConf.id, con.id);
      if (ac) {
        allowedMethods = await dbs.published_methods.find({
          connection_id: con.id,
          $existsJoined: {
            access_control_methods: { access_control_id: ac.id },
          },
        });
      }
    }

    allowedMethods.forEach((m) => {
      result[m.name] = {
        input: m.arguments.reduce((a, v) => ({ ...a, [v.name]: v }), {}),
        outputTable: m.outputTable ?? undefined,
        run: async (args) => {
          const sourceCode = getCompiledTS(m.run);

          try {
            let validatedArgs: AnyObject | undefined = undefined;
            if (m.arguments.length) {
              /**
               * Validate args
               */
              for await (const arg of m.arguments) {
                let argType = omitKeys(arg, ["name"]);
                if (arg.type === "Lookup" || arg.type === "Lookup[]") {
                  argType = {
                    ...omitKeys(arg, ["type", "name", "optional"]),
                    lookup: {
                      ...arg.lookup,
                      type: "data",
                    },
                  } as any;
                }
                const partialArgSchema: JSONBColumnDef["jsonbSchema"] = {
                  //@ts-ignore
                  type: { [arg.name]: argType },
                };
                const partialValue = pickKeys(args, [arg.name]);

                try {
                  if (arg.type !== "any") {
                    await _dbs.any(
                      "SELECT validate_jsonb_schema(${argSchema}::TEXT, ${args})",
                      { args: partialValue, argSchema: partialArgSchema },
                    );
                  }
                } catch (error) {
                  throw {
                    message: "Could not validate argument against schema",
                    argument: arg.name,
                    error,
                  };
                }
              }
              validatedArgs = args;
            }

            const forkedPrglProcRunner = await getForkedProcRunner();
            return forkedPrglProcRunner.run({
              type: "run",
              code: sourceCode,
              validatedArgs,
              user,
            });
          } catch (err: any) {
            return Promise.reject(err);
          }
        },
      };
    });

    return result;
  };
  return publishMethods;
};
