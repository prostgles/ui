import {
  type DBHandlerClient,
  useAsyncEffectQueue,
} from "prostgles-client/dist/prostgles";
import { includes } from "prostgles-types";
import { useMemo, useState } from "react";
import type { DBSSchema } from "@common/publishUtils";
import type { AppState } from "../App";
import type { DBS, DBSMethods } from "../dashboard/Dashboard/DBS";
import { getTables } from "../dashboard/Dashboard/Dashboard";
import { dbsConnectionOptions } from "./dbsConnectionOptions";
import { useDBSClient } from "./useDBSClient";
import { useServerState } from "./useServerState";

export const useAppState = (
  onDisconnect: (isDisconnected: boolean) => void,
) => {
  const serverState = useServerState();
  const dbsClient = useDBSClient(onDisconnect, serverState);
  const [user, setUser] = useState<DBSSchema["users"]>();

  const prglStateWaiting = dbsClient.hasError || dbsClient.isLoading;
  const prglState: AppState["prglState"] = useMemo(() => {
    if (prglStateWaiting) return;
    const { dbo: dbs, methods, auth, tableSchema, socket } = dbsClient;

    const { tables: dbsTables = [] } = getTables(
      tableSchema ?? [],
      dbsConnectionOptions.table_options,
      dbs as DBHandlerClient,
      true,
    );
    (window as any).dbs = dbs;
    (window as any).dbsSocket = socket;
    (window as any).dbsMethods = methods;
    (window as any).auth = auth;
    return {
      dbs: dbs as DBS,
      dbsMethods: methods as DBSMethods,
      dbsTables,
      auth,
      isAdminOrSupport: includes(["admin", "support"], auth.user?.type),
      dbsSocket: socket,
      sid: auth.user?.sid,
      dbsKey: Date.now() + "",
    };
  }, [dbsClient, prglStateWaiting]);

  const { dbs, auth } = prglState ?? {};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffectQueue(async () => {
    if (!dbs || !auth?.user?.id) return;

    const userSub = await dbs.users.subscribeOne(
      { id: auth.user.id },
      {},
      (user) => {
        setUser(user);
      },
    );

    return userSub.unsubscribe;
  }, [dbs, auth]);

  const dbsClientError =
    dbsClient.hasError ? dbsClient.error || "Unknown error" : undefined;

  if (dbsClientError) {
    return {
      state: "error" as const,
      dbsClientError,
      prglState: undefined,
      user: undefined,
      serverState,
    };
  }

  return {
    state: prglStateWaiting ? ("loading" as const) : ("ok" as const),
    dbsClientError: undefined,
    prglState,
    user,
    serverState,
  };
};
