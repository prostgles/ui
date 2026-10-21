import { getAuth } from "@src/authConfig/getAuth";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { AuthConfigForConnection } from "@src/authConfig/subscribeToAuthSetupChanges";
import type e from "express";
import type { AuthConfig } from "prostgles-server";
import type { DB } from "prostgles-server/dist/initProstgles";
import type { DBS } from "..";
import { getConnectionUser } from "./getConnectionUser";
import { isObject } from "prostgles-types";

export const getConnectionAuth = async (
  app: e.Express,
  dbs: DBS,
  _dbs: DB,
  authData: AuthConfigForConnection,
) => {
  const auth = await getAuth(app, dbs, _dbs, authData);
  return {
    ...(!authData.connection.is_state_db && authData.connection.port ?
      (auth as unknown as AuthConfig<void, SUser>)
    : {}),
    sidKeyName: auth.sidKeyName,
    cacheSession: auth.cacheSession,
    getUser: async (sid, __, _, cl, reqInfo) => {
      const result = await auth.getUser(sid, dbs, _dbs, cl, reqInfo);
      if (!result || !isObject(result) || !("user" in result) || !result.user) {
        return result;
      }
      const user = await getConnectionUser(
        dbs,
        authData.connection,
        result.user,
      );
      if (!user) return undefined;
      return {
        ...result,
        user,
      };
    },
    findUser: async (filter) =>
      getConnectionUser(dbs, authData.connection, await auth.findUser(filter)),
  } satisfies AuthConfig<void, SUser>;
};
