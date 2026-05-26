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

export const runConnectionQuery = async <T extends AnyObject = AnyObject>(
  connId: string,
  query: string,
  args?: AnyObject | any[],
  asAdminOpts?: { dbs: DBS },
  /**
   * The database might have been deleted. Try and find one that is avalable
   */
  findFirstAvailableInServer = false,
): Promise<T[]> => {
  if (asAdminOpts) {
    const { db } = await getSuperUserCDB(connId, asAdminOpts.dbs);
    return db.any(query, args);
  }

  const dbInstance = await getCDB(connId).catch((err) => {
    if (findFirstAvailableInServer) {
      console.warn(
        `Could not find database for connection ${connId}, trying to find another one in the same server. Error: ${err}`,
      );
      for (const database of ["template1", "postgres"]) {
        try {
          return getCDB(connId, { database });
        } catch (err) {}
      }
    }
  });
  if (!dbInstance) {
    throw new Error(`Could not find database for connection ${connId}`);
  }

  return dbInstance.db.any(query, args);
};
