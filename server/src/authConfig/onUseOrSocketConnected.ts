import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";
import { connMgr, tout, type DBS } from "..";
import { getElectronConfig } from "../electronConfig";
import {
  getClientRequestIPsInfo,
  HTTP_FAIL_CODES,
} from "prostgles-server/dist/Auth/AuthHandler";
import { getActiveSession } from "./getActiveSession";
import {
  checkClientIP,
  getPasswordlessMagicLink,
  insertUser,
  makeMagicLink,
  PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
} from "./sessionUtils";
import { tryCatchV2 } from "prostgles-types";
import { DAY, ROUTES } from "../../../commonTypes/utils";
import { createPasswordlessAdminSessionIfNeeded } from "./createPasswordlessAdminSessionIfNeeded";

export const getOnUseOrSocketConnected = (
  dbs: DBS,
  authSetupData: AuthSetupData,
) => {
  const onUseOrSocketConnected: AuthConfig["onUseOrSocketConnected"] = async (
    sid,
    client,
    reqInfo,
  ) => {
    while (!authSetupData.globalSettings) {
      console.warn(
        "Delaying user request until globalSettings is ready",
        reqInfo,
      );
      await tout(2000);
    }
    const { globalSettings, passwordlessAdmin } = authSetupData;

    const electronConfig = getElectronConfig();
    // const sid = req.cookies[sidKeyName];
    if (electronConfig?.isElectron) {
      if (electronConfig.sidConfig.electronSid !== sid) {
        return {
          httpCode: 400,
          error: "Not authorized. Expecting a different electron sid",
        };
      }
      return;
    }

    /** Ensure that only 1 session is allowed for the passwordless admin */
    // if (passwordlessAdmin) {
    //   const pwdLessSession = await dbs.sessions.findOne({
    //     user_id: passwordlessAdmin.id  ,
    //     active: true,
    //   });
    //   if (pwdLessSession && pwdLessSession.id !== sid)  {
    //     if (
    //       electronConfig?.isElectron &&
    //       electronConfig.sidConfig.electronSid === sid
    //     ) {
    //       await dbs.sessions.delete({
    //         user_id: passwordlessAdmin.id,
    //       });
    //     } else {
    //       return {
    //         error: PASSWORDLESS_ADMIN_ALREADY_EXISTS_ERROR,
    //         httpCode: HTTP_FAIL_CODES.UNAUTHORIZED,
    //       };
    //     }
    //   }
    // }
    // };

    // const { httpReq } = reqInfo;
    // const isAccessingMagicLink =
    //   httpReq && httpReq.originalUrl.startsWith(ROUTES.MAGIC_LINK + "/");

    // if (passwordlessAdmin && !sid && !isAccessingMagicLink) {
    //   // need to ensure that only 1 session is allowed for the passwordless admin
    //   const {
    //     data: magicLinkPaswordless,
    //     hasError,
    //     error,
    //   } = await tryCatchV2(() => getPasswordlessMagicLink(dbs));
    //   if (hasError || magicLinkPaswordless.state === "magic-link-exists") {
    //     res
    //       .status(HTTP_FAIL_CODES.UNAUTHORIZED)
    //       .json({ error: magicLinkPaswordless?.error ?? error });
    //     return;
    //   }
    //   if (magicLinkPaswordless.magicLinkUrl) {
    //     res.redirect(magicLinkPaswordless.magicLinkUrl);
    //     return;
    //   }
    // }

    // if (globalSettings.allowed_ips_enabled) {
    //   const ipCheck = await checkClientIP(dbs, reqInfo, globalSettings);
    //   if (!ipCheck.isAllowed) {
    //     return { error: "Your IP is not allowed", httpCode: 403 };
    //   }
    // }

    // const publicConnections = connMgr.getConnectionsWithPublicAccess();
    // if (publicConnections.length) {
    //   const isLoggingIn =
    //     isAccessingMagicLink || req.originalUrl.startsWith(ROUTES.LOGIN);
    //   const client = getClientRequestIPsInfo({ httpReq: req });
    //   let hasNoActiveSession = !sid;
    //   if (sid) {
    //     const activeSessionInfo = await getActiveSession(dbs, {
    //       type: "session-id",
    //       client,
    //       filter: { id: sid },
    //     });
    //     if (activeSessionInfo.error) {
    //       res.status(HTTP_FAIL_CODES.BAD_REQUEST).json(activeSessionInfo.error);
    //       return;
    //     }
    //     hasNoActiveSession = !activeSessionInfo.validSession;
    //   }

    //   /** If no sid then create a public anonymous account */
    //   if (this._db && hasNoActiveSession && !isLoggingIn) {
    //     const newRandomUser = await insertUser(dbs, this._db, {
    //       username: `user-${new Date().toISOString()}_${Math.round(Math.random() * 1e8)}`,
    //       password: "",
    //       type: "public",
    //     });
    //     if (newRandomUser) {
    //       const mlink = await makeMagicLink(newRandomUser, dbs, "/", {
    //         session_expires: Date.now() + DAY * 2,
    //       });
    //       res.redirect(mlink.magic_login_link_redirect);
    //       return;
    //     }
    //   }
    // }
  };

  return onUseOrSocketConnected;
};
