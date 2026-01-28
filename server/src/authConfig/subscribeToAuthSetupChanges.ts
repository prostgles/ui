import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import type { DBSSchema } from "@common/publishUtils";
import { tout } from "@src/utils/tout";
import { getKeys, isEqual } from "prostgles-types";
import { type DBS } from "../index";
import { activePasswordlessAdminFilter } from "../init/initUsers";

export type AuthConfigForStateConnection = {
  stateDatabaseConfig: DBSSchema["database_configs"];
  passwordlessAdmin:
    | (Pick<DBSSchema["users"], "id" | "type"> & {
        sessions: DBSSchema["sessions"][];
        activeSessions: DBSSchema["sessions"][];
      })
    | undefined;
};
export type ConnectionAuthSetup = {
  connectionDatabaseConfig: DBSSchema["database_configs"];
  connection: Pick<
    DBSSchema["connections"],
    "id" | "url_path" | "port" | "is_state_db"
  >;
};

export type AuthConfigForConnection = AuthConfigForStateConnection &
  ({ type: "connection" } & ConnectionAuthSetup);
export type AuthConfigForStateOrConnection =
  | (AuthConfigForStateConnection & {
      type: "state";
    })
  | AuthConfigForConnection;

let authSetupData: AuthConfigForStateConnection | undefined;

export type AuthSetupDataListener = Promise<{
  context: Partial<AuthConfigForStateConnection>;
  destroy: () => Promise<void>;
}>;

export const subscribeToAuthSetupChanges = async (
  dbs: DBS,
  onChange: (auth: AuthConfigForStateConnection) => void | Promise<void>,
  oldListener: AuthSetupDataListener | undefined,
): AuthSetupDataListener => {
  await (await oldListener)?.destroy();
  let context: Partial<AuthConfigForStateConnection> = {};
  const totalContextKeys = getKeys({
    passwordlessAdmin: 1,
    stateDatabaseConfig: 1,
  } satisfies Record<keyof AuthConfigForStateConnection, 1>);

  const setContext = (changes: Partial<AuthConfigForStateConnection>) => {
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
    authSetupData = { ...context } as AuthConfigForStateConnection;

    void onChange(context as AuthConfigForStateConnection);
  };

  const connectionSub = await dbs.database_configs.subscribeOne(
    {
      $existsJoined: { connections: { is_state_db: true } },
    },
    {},
    (database_config) => {
      setContext({
        stateDatabaseConfig: database_config,
      });
    },
  );
  /** This is used to exclude docker-mcp session that changes frequently and causes page restart when running a docker mcp */
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
          passwordlessAdmin as AuthConfigForStateConnection["passwordlessAdmin"],
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
  while (!authSetupData?.stateDatabaseConfig) {
    console.warn("Delaying user request until GlobalSettings area available");
    await tout(500);
  }
  return authSetupData.stateDatabaseConfig;
};

export const getAuthSetupData = () => {
  return (
    authSetupData ?? {
      stateDatabaseConfig: undefined,
      globalSettings: undefined,
      passwordlessAdmin: undefined,
    }
  );
};
