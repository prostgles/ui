import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";

import type { DB } from "prostgles-server/dist/initProstgles";
import { checkClientIP } from "./sessionUtils";
import type { AuthConfigForStateOrConnection } from "./subscribeToAuthSetupChanges";

export const getOnUseOrSocketConnected = (
  _dbs: DB,
  authSetupData: AuthConfigForStateOrConnection,
) => {
  const onUseOrSocketConnected: AuthConfig["onUseOrSocketConnected"] = async (
    sid,
    _client,
    reqInfo,
  ) => {
    const { stateDatabaseConfig: database_config } = authSetupData;

    /** Is this needed, given that we use electronSid to create a session */
    // const electronConfig = getElectronConfig();
    // if (
    //   electronConfig?.isElectron &&
    //   electronConfig.sidConfig.electronSid !== sid
    // ) {
    //   return {
    //     httpCode: 400,
    //     error: "Not authorized. Expecting a different " + sidKeyName,
    //   };
    // }

    if (database_config.allowed_ips_enabled) {
      const ipCheck = await checkClientIP(
        _dbs,
        reqInfo,
        authSetupData.stateDatabaseConfig,
      );
      if (!ipCheck.isAllowed) {
        return { error: "Your IP is not allowed", httpCode: 403 };
      }
    }
  };

  return onUseOrSocketConnected;
};
