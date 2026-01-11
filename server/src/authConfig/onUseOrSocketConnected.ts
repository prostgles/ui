import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { tout, type DBS } from "..";
import { checkClientIP, sidKeyName } from "./sessionUtils";
import type { AuthConfigForStateConnection } from "./subscribeToAuthSetupChanges";
import { getElectronConfig } from "../electronConfig";

export const getOnUseOrSocketConnected = (
  dbs: DBS,
  authSetupData: AuthConfigForStateConnection,
) => {
  const onUseOrSocketConnected: AuthConfig["onUseOrSocketConnected"] = async (
    sid,
    client,
    reqInfo,
  ) => {
    while (!authSetupData.database_config) {
      console.warn(
        "Delaying user request until database_config is ready",
        reqInfo,
      );
      await tout(2000);
    }
    const { database_config } = authSetupData;

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
        dbs,
        reqInfo,
        authSetupData.database_config,
      );
      if (!ipCheck.isAllowed) {
        return { error: "Your IP is not allowed", httpCode: 403 };
      }
    }
  };

  return onUseOrSocketConnected;
};
