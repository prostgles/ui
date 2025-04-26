import { getKeys, isEqual, type SubscriptionHandler } from "prostgles-types";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { DBS } from "../index";
import {
  activePasswordlessAdminFilter,
  getPasswordlessAdmin,
} from "../SecurityManager/initUsers";
import { tableConfig } from "../tableConfig/tableConfig";

let globalSettingSub: SubscriptionHandler | undefined;
let passwordlessAdminSub: SubscriptionHandler | undefined;

export type AuthSetupData = {
  globalSettings: DBSSchema["global_settings"] | undefined;
  passwordlessAdmin:
    | (DBSSchema["users"] & {
        sessions: DBSSchema["sessions"][];
        activeSessions: DBSSchema["sessions"][];
      })
    | undefined;
};

export let authSetupData: AuthSetupData | undefined;

export const onAuthSetupDataChange = async (
  dbs: DBS,
  onChange: (auth: AuthSetupData) => void,
) => {
  const context: Partial<AuthSetupData> = {
    globalSettings: undefined,
    passwordlessAdmin: undefined,
  };
  const contextKeys = getKeys({
    globalSettings: 1,
    passwordlessAdmin: 1,
  } satisfies Record<keyof AuthSetupData, 1>);

  const setContext = async (newContext: Partial<AuthSetupData>) => {
    const oldContext = { ...context };
    Object.assign(context, { ...oldContext, ...newContext });
    const newKeyCount = Object.keys(context).length;
    if (isEqual(oldContext, context) || newKeyCount !== contextKeys.length)
      return;
    authSetupData = context as AuthSetupData;
    onChange(context as AuthSetupData);
  };

  /** Add cors config if missing */
  if (!(await dbs.global_settings.count())) {
    await dbs.global_settings.insert({
      /** Origin "*" is required to enable API access */
      allowed_origin: (await getPasswordlessAdmin(dbs)) ? null : "*",
      allowed_ips_enabled: false,
      allowed_ips: ["::ffff:127.0.0.1"],
      tableConfig,
    });
  }

  await globalSettingSub?.unsubscribe();
  globalSettingSub = await dbs.global_settings.subscribeOne(
    {},
    {},
    async (globalSettings) => {
      setContext({
        globalSettings,
      });
    },
  );

  await passwordlessAdminSub?.unsubscribe();
  passwordlessAdminSub = await dbs.users.subscribeOne(
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
    async (passwordlessAdmin) => {
      setContext({
        passwordlessAdmin: passwordlessAdmin as any,
      });
    },
  );
  return context;
};
