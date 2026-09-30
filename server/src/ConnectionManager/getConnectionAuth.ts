import { getAuth } from "@src/authConfig/getAuth";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { AuthConfigForConnection } from "@src/authConfig/subscribeToAuthSetupChanges";
import type e from "express";
import type { AuthConfig } from "prostgles-server";
import type { DB } from "prostgles-server/dist/initProstgles";
import type { DBS } from "..";

export const getConnectionAuth = async (
  app: e.Express,
  dbs: DBS,
  _dbs: DB,
  authData: AuthConfigForConnection,
) => {
  const auth = await getAuth(app, dbs, _dbs, authData);
  // if (!auth) return;

  /**
   * We have two authorization modes:
   * 1. State database auth
   *  - Accessing the prostgles-ui interface must give access to all connections
   * 2. Connection database auth
   *  - Enabled by specifying a port on the connection which will be proxied to a subpath.
   *  - Accessing the designated subpath must give access only to that connection and state database users cannot login there.
   */
  if (!authData.connection.is_state_db && authData.connection.port) {
    return auth as any;
  }
  return {
    sidKeyName: auth.sidKeyName,
    getUser: (sid, __, _, cl, reqInfo) =>
      auth.getUser(sid, dbs, _dbs, cl, reqInfo),
    findUser: auth.findUser,
    cacheSession: {
      getSession: (sid) => auth.cacheSession.getSession(sid, dbs),
    },
  } satisfies AuthConfig<void, SUser>;
};
