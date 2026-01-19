import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { type DBS } from "..";

import { sidKeyName } from "@common/authTypesAndConstants";
import { getElectronConfig } from "../electronConfig";
import { checkClientIP } from "./sessionUtils";
import type { AuthConfigForStateOrConnection } from "./subscribeToAuthSetupChanges";
import { tout } from "@src/utils/tout";

export const getOnUseOrSocketConnected = (
  dbs: DBS,
  authSetupData: AuthConfigForStateOrConnection,
) => {
  const onUseOrSocketConnected: AuthConfig["onUseOrSocketConnected"] = async (
    sid,
    _client,
    reqInfo,
  ) => {
    // while (!authSetupData.stateDatabaseConfig) {
    //   console.warn(
    //     "Delaying user request until database_config is ready",
    //     reqInfo,
    //   );
    //   await tout(2000);
    // }
    const { stateDatabaseConfig: database_config } = authSetupData;

    /** Is this needed? */
    const electronConfig = getElectronConfig();
    if (
      electronConfig?.isElectron &&
      electronConfig.sidConfig.electronSid !== sid
    ) {
      return {
        httpCode: 400,
        error: "Not authorized. Expecting a different " + sidKeyName,
      };
    }

    if (database_config.allowed_ips_enabled) {
      const ipCheck = await checkClientIP(
        dbs.sql,
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
