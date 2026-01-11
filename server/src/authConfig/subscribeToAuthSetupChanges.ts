import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import type { DBSSchema } from "@common/publishUtils";
import { getKeys, isEqual } from "prostgles-types";
import { tout, type DBS } from "../index";
import { activePasswordlessAdminFilter } from "../SecurityManager/initUsers";

export type AuthSetupData = {
  database_config: DBSSchema["database_configs"] | undefined;
  passwordlessAdmin:
    | (Pick<DBSSchema["users"], "id" | "type"> & {
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
    passwordlessAdmin: 1,
    database_config: 1,
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

  const connectionSub = await dbs.database_configs.subscribeOne(
    {
      $existsJoined: { connections: { is_state_db: true } },
    },
    {},
    (database_config) => {
      setContext({
        database_config,
      });
    },
  );
  /** This is used to avoid docker-mcp session that changes frequently and causes page restart when running a docker mcp */
  const userAgentFilter = {
    user_agent: { $ne: DOCKER_USER_AGENT },
  };
  const passwordlessAdminSub = await dbs.users.subscribeOne(
    activePasswordlessAdminFilter,
    {
      select: {
        id: 1,
        type: 1,
        sessions: {
          $leftJoin: "sessions",
          select: "*",
          filter: userAgentFilter,
        },
        activeSessions: {
          $leftJoin: "sessions",
          select: "*",
          filter: {
            "expires.>": Date.now(),
            active: true,
            ...userAgentFilter,
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
    await passwordlessAdminSub.unsubscribe();
    await connectionSub.unsubscribe();
  };
  return { context, destroy };
};

export const waitForDatabaseConfig = async () => {
  while (!authSetupData?.database_config) {
    console.warn("Delaying user request until GlobalSettings area available");
    await tout(500);
  }
  return authSetupData.database_config;
};

export const getAuthSetupData = () => {
  return (
    authSetupData ?? {
      database_config: undefined,
      globalSettings: undefined,
      passwordlessAdmin: undefined,
    }
  );
};
