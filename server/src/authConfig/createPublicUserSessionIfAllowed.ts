import type {
  AuthClientRequest,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import { connMgr, type DBS } from "..";
import { insertUser, makeSession } from "./sessionUtils";
import { getIPsFromClientInfo } from "./startRateLimitedLoginAttempt";
import type { AuthConfigForStateConnection } from "./subscribeToAuthSetupChanges";
import { DAY } from "@common/utils";
import type { NewRedirectSession } from "./getUser";

export const createPublicUserSessionIfAllowed = async (
  authSetupData: AuthConfigForStateConnection,
  dbs: DBS,
  client: LoginClientInfo,
  reqInfo: AuthClientRequest,
): Promise<NewRedirectSession | undefined> => {
  const publicConnections = connMgr.getConnectionsWithPublicAccess();
  const { database_config } = authSetupData;
  if (!publicConnections.length || !database_config || !reqInfo.httpReq) {
    return;
  }
  const { ip } = getIPsFromClientInfo(client, database_config);
  const session = await dbs.tx(async (dbsTx) => {
    const newRandomUser = await insertUser(dbsTx, {
      username: `user-${new Date().toISOString()}_${Math.round(Math.random() * 1e8)}`,
      password: "",
      type: "public",
    });
    if (!newRandomUser) {
      return;
    }

    return makeSession(
      newRandomUser,
      {
        ip_address: ip,
        user_agent: client.user_agent || null,
        type: "web",
      },
      dbsTx as DBS,
      Date.now() + Number(7 * DAY),
    );
  });

  if (!session) {
    return;
  }
  return {
    type: "new-session",
    session,
    reqInfo,
  };
};
