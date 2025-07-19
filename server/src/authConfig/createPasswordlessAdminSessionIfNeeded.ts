import type {
  AuthClientRequest,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "..";
import { debouncePromise, YEAR } from "../../../commonTypes/utils";
import { activePasswordlessAdminFilter } from "../SecurityManager/initUsers";
import type { NewRedirectSession } from "./getUser";
import { makeSession } from "./sessionUtils";
import { getIPsFromClientInfo } from "./startRateLimitedLoginAttempt";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";

export const createPasswordlessAdminSessionIfNeeded = debouncePromise(
  async (
    authSetupData: AuthSetupData,
    dbs: DBS,
    client: LoginClientInfo,
    reqInfo: AuthClientRequest,
  ): Promise<NewRedirectSession | undefined> => {
    const { passwordlessAdmin, globalSettings } = authSetupData;
    if (!passwordlessAdmin || !globalSettings || !reqInfo.httpReq) {
      return;
    }

    /**
     * Always maintain a valid session for passwordless admin
     */
    if (passwordlessAdmin.sessions.length) {
      const validSession = passwordlessAdmin.sessions.find((s) => {
        return s.active && Number(s.expires) > Date.now();
      });
      if (!validSession) {
        const anyPasswordlessSession = await dbs.sessions.findOne({
          user_id: passwordlessAdmin.id,
        });
        if (anyPasswordlessSession) {
          await dbs.sessions.update(
            { id: anyPasswordlessSession.id },
            { active: true, expires: Date.now() + 1 * YEAR },
            { returning: "*", multi: false },
          );
        }
      }
      return;
    }

    const { ip } = getIPsFromClientInfo(client, globalSettings);
    /** Ensure multiple passwordlessAdmin sessions are not allowed */
    const session = await dbs.tx(async (dbsTx) => {
      const isStillActive = await dbsTx.users.findOne(
        activePasswordlessAdminFilter,
      );
      if (!isStillActive) {
        return undefined;
      }
      await dbsTx.sessions.delete({
        user_id: passwordlessAdmin.id,
      });
      console.log(
        "createPasswordlessAdminSessionIfNeeded: creating new session",
        passwordlessAdmin.id,
      );
      return makeSession(
        authSetupData.passwordlessAdmin,
        {
          ip_address: ip,
          user_agent: client.user_agent || null,
          type: "web",
        },
        dbsTx as DBS,
        Date.now() + Number(10 * YEAR),
      );
    });

    /** Potential race condition between authSetupData and actual data */
    if (!session) {
      return undefined;
    }

    return {
      type: "new-session",
      session,
      reqInfo,
    };
  },
);
