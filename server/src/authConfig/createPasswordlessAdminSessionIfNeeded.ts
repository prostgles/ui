import type {
  BasicSession,
  LoginClientInfo,
} from "prostgles-server/dist/Auth/AuthTypes";
import type { DBS } from "..";
import { debouncePromise, YEAR } from "../../../commonTypes/utils";
import type { AuthSetupData } from "./onAuthSetupDataChange";
import { getIPsFromClientInfo } from "./startRateLimitedLoginAttempt";
import { makeSession } from "./sessionUtils";

export const createPasswordlessAdminSessionIfNeeded = debouncePromise(
  async (
    authSetupData: AuthSetupData,
    dbs: DBS,
    client: LoginClientInfo,
    sid: string | undefined,
  ): Promise<{ type: "new-session"; session: BasicSession } | undefined> => {
    const { passwordlessAdmin, globalSettings } = authSetupData;
    if (!passwordlessAdmin || !globalSettings) {
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
          const renewedSession = await dbs.sessions.update(
            { id: anyPasswordlessSession.id },
            { active: true, expires: Date.now() + 1 * YEAR },
            { returning: "*", multi: false },
          );
        }
      }
      return;
    }

    const { ip } = getIPsFromClientInfo(client, globalSettings);
    const session = await makeSession(
      authSetupData.passwordlessAdmin,
      {
        ip_address: ip,
        user_agent: client.user_agent || null,
        type: "web",
      },
      dbs,
      Date.now() + Number(10 * YEAR),
    );

    return {
      type: "new-session",
      session,
    };
  },
);
