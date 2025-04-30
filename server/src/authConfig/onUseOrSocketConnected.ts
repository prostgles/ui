import type { AuthConfig } from "prostgles-server/dist/Auth/AuthTypes";
import { tout, type DBS } from "..";
import { checkClientIP } from "./sessionUtils";
import type { AuthSetupData } from "./subscribeToAuthSetupChanges";

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
    const { globalSettings } = authSetupData;

    /** Is this needed? */
    // const electronConfig = getElectronConfig();
    // if (electronConfig?.isElectron) {
    //   if (electronConfig.sidConfig.electronSid !== sid) {
    //     return {
    //       httpCode: 400,
    //       error: "Not authorized. Expecting a different electron sid",
    //     };
    //   }
    //   return;
    // }

    if (globalSettings.allowed_ips_enabled) {
      const ipCheck = await checkClientIP(dbs, reqInfo, globalSettings);
      if (!ipCheck.isAllowed) {
        return { error: "Your IP is not allowed", httpCode: 403 };
      }
    }
  };

  return onUseOrSocketConnected;
};
