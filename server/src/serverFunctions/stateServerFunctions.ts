import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { DBS } from "../index";
import { connectionManager } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import { defineFunction } from "prostgles-server";
import type { AnyObject } from "prostgles-types";
import {
  getCDB,
  getSuperUserCDB,
} from "../ConnectionManager/ConnectionManager";
import { stateServerAdminFunctions } from "./adminServerFunctions/stateServerAdminFunctions";
import { defineFunctionGroup } from "./defineFunctionGroup";
import { insertConfigWorkspaces } from "./insertConfigWorkspaces";
import { userServerFunctions } from "./userServerFunctions/userServerFunctions";

export const stateServerFunctions = {
  ...userServerFunctions,
  ...stateServerAdminFunctions,
  anyUser: defineFunctionGroup({
    userFilter: {},
    functions: {
      startConnection: defineFunction({
        input: { connectionId: "string" },
        unrestrictedDbAccess: true,
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
            await insertConfigWorkspaces(connectionId, dbs, user.id);
            return socketPathAndUrl;
          } catch (error) {
            console.error("Could not start connection " + connectionId, error);
            /* Used to prevent data leak to client */
            if (user.type === "admin") {
              throw error;
            } else {
              throw `Something went wrong when connecting to ${connectionId}`;
            }
          }
        },
      }),
    },
  }),
}; // as const satisfies ServerFunctionDefinitions<DBGeneratedSchema, SUser>;

export const runConnectionQuery = async <T extends AnyObject = AnyObject>(
  connId: string,
  query: string,
  args?: AnyObject | any[],
  asAdminOpts?: { dbs: DBS },
  /**
   * The database might have been deleted. Try and find one that is available
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
