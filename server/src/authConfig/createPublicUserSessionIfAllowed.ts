import type {
  AuthClientRequest,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import { connMgr, type DBS } from "..";
import { insertUser, makeSession } from "./sessionUtils";
import { getIPsFromClientInfo } from "./startRateLimitedLoginAttempt";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";
import { DAY } from "../../../commonTypes/utils";
import type { NewRedirectSession } from "./getUser";

export const createPublicUserSessionIfAllowed = async (
  authSetupData: AuthSetupData,
  dbs: DBS,
  client: LoginClientInfo,
  reqInfo: AuthClientRequest,
): Promise<NewRedirectSession | undefined> => {
  const publicConnections = connMgr.getConnectionsWithPublicAccess();
  const { globalSettings } = authSetupData;
  if (!publicConnections.length || !globalSettings || !reqInfo.httpReq) {
    return;
    // const isLoggingIn =
    //   isAccessingMagicLink || req.originalUrl.startsWith(ROUTES.LOGIN);
    // const client = getClientRequestIPsInfo({ httpReq: req });
    // let hasNoActiveSession = !sid;
    // if (sid) {
    //   const activeSessionInfo = await getActiveSession(dbs, {
    //     type: "session-id",
    //     client,
    //     filter: { id: sid },
    //   });
    //   if (activeSessionInfo.error) {
    //     res.status(HTTP_FAIL_CODES.BAD_REQUEST).json(activeSessionInfo.error);
    //     return;
    //   }
    //   hasNoActiveSession = !activeSessionInfo.validSession;
    // }

    /** If no sid then create a public account */
    // const mlink = await makeMagicLink(newRandomUser, dbs, "/", {
    //   session_expires: Date.now() + DAY * 2,
    // });
    // res.redirect(mlink.magic_login_link_redirect);
  }
  const { ip } = getIPsFromClientInfo(client, globalSettings);
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
