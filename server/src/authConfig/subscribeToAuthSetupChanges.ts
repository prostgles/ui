import { getKeys, isEqual } from "prostgles-types";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { tout, type DBS } from "../index";
import {
  activePasswordlessAdminFilter,
  getPasswordlessAdmin,
} from "../SecurityManager/initUsers";
import { tableConfig } from "../tableConfig/tableConfig";

export type AuthSetupData = {
  globalSettings: DBSSchema["global_settings"] | undefined;
  passwordlessAdmin:
    | (DBSSchema["users"] & {
        sessions: DBSSchema["sessions"][];
        activeSessions: DBSSchema["sessions"][];
      })
    | undefined;
};

let authSetupData: AuthSetupData | undefined;

export type AuthSetupDataListener = Promise<{
  context: Partial<AuthSetupData>;
  destroy: () => Promise<void>;
}>;

export const subscribeToAuthSetupChanges = async (
  dbs: DBS,
  onChange: (auth: AuthSetupData) => void | Promise<void>,
  oldListener: AuthSetupDataListener | undefined,
): AuthSetupDataListener => {
  await (await oldListener)?.destroy();
  let context: Partial<AuthSetupData> = {};
  const totalContextKeys = getKeys({
    globalSettings: 1,
    passwordlessAdmin: 1,
  } satisfies Record<keyof AuthSetupData, 1>);

  const setContext = (changes: Partial<AuthSetupData>) => {
    const oldContext = { ...context };
    const newContext = { ...context, ...changes };
    const newKeyCount = Object.keys(newContext).length;
    context = { ...newContext };
    if (
      isEqual(oldContext, newContext) ||
      newKeyCount !== totalContextKeys.length
    ) {
      return;
    }
    authSetupData = { ...context } as AuthSetupData;

    void onChange(context as AuthSetupData);
  };

  /** Add cors config if missing */
  await dbs.tx(async (dbsTx) => {
    if (!(await dbsTx.global_settings.count())) {
      await dbsTx.global_settings.insert({
        /** Origin "*" is required to enable API access */
        allowed_origin: (await getPasswordlessAdmin(dbsTx)) ? null : "*",
        allowed_ips_enabled: false,
        allowed_ips: ["::ffff:127.0.0.1"],
        tableConfig,
      });
    }
  });

  const globalSettingSub = await dbs.global_settings.subscribeOne(
    {},
    {},
    (globalSettings) => {
      setContext({
        globalSettings,
      });
    },
  );

  const passwordlessAdminSub = await dbs.users.subscribeOne(
    activePasswordlessAdminFilter,
    {
      select: {
        "*": 1,
        sessions: "*",
        activeSessions: {
          $leftJoin: "sessions",
          select: "*",
          filter: {
            "expires.>": Date.now(),
            active: true,
          },
        },
      },
    },
    (passwordlessAdmin) => {
      setContext({
        passwordlessAdmin:
          passwordlessAdmin as AuthSetupData["passwordlessAdmin"],
      });
    },
  );
  const destroy = async () => {
    await globalSettingSub.unsubscribe();
    await passwordlessAdminSub.unsubscribe();
  };
  return { context, destroy };
};

export const waitForGlobalSettings = async () => {
  while (!authSetupData?.globalSettings) {
    console.warn("Delaying user request until GlobalSettings area available");
    await tout(500);
  }
  return authSetupData.globalSettings;
};

export const getAuthSetupData = () => {
  return (
    authSetupData ?? {
      globalSettings: undefined,
      passwordlessAdmin: undefined,
    }
  );
};
