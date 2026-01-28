import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBS } from "../index";
import { connectionManager } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import {
  createServerFunctionWithContext,
  type PublishParams,
  type ServerFunctionDefinition,
} from "prostgles-server";
import type { AnyObject } from "prostgles-types";
import { type SUser } from "../authConfig/sessionUtils";
import {
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import { getAdminServerFunctions } from "./adminServerFunctions/getAdminServerFunctions";
import { getServerFunctionsContext } from "./getServerFunctionsContext";
import { getUserServerFunctions } from "./userServerFunctions/getUserServerFunctions";

export const getServerFunctions = async (
  params: PublishParams<DBGeneratedSchema, SUser> | undefined,
) => {
  const context = await getServerFunctionsContext(params);
  const definePublicFunction = createServerFunctionWithContext(params);

  const userServerFunctions = await getUserServerFunctions(params);
  const adminMethods = getAdminServerFunctions(context);
  return {
    ...userServerFunctions,
    ...adminMethods,
    startConnection: definePublicFunction({
      input: { connectionId: "string" },
      run: async (
        { connectionId },
        { user, dbo: dbs, db: _dbs, clientReq: { socket } },
      ) => {
        try {
          const socketPathAndUrl = await connectionManager.startConnection(
            connectionId,
            dbs,
            _dbs,
            socket,
          );
          return socketPathAndUrl;
        } catch (error) {
          console.error("Could not start connection " + connectionId, error);
          /* Used to prevent data leak to client */
          if (user?.type === "admin") {
            throw error;
          } else {
            throw `Something went wrong when connecting to ${connectionId}`;
          }
        }
      },
    }),
  } as const satisfies Record<string, ServerFunctionDefinition>;
};

export const runConnectionQuery = async (
  connId: string,
  query: string,
  args?: AnyObject | any[],
  asAdminOpts?: { dbs: DBS },
): Promise<AnyObject[]> => {
  const { db } =
    asAdminOpts ?
      await getSuperUserCDB(connId, asAdminOpts.dbs)
    : await getCDB(connId);
  return db.any(query, args);
};
