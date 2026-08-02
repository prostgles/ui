import type { DBSSchema } from "@common/publishUtils";
import { useAsyncEffectQueue } from "prostgles-client";
import { useMemo, useState } from "react";
import type { PrglReadyState } from "../App";
import type { DBS, DBSMethods } from "../dashboard/Dashboard/DBS";
import {
  getTables,
  type DBSchemaTableWithOptions,
} from "../dashboard/Dashboard/getTables";
import { useDBSClient } from "./useDBSClient";
import { useServerState } from "./useServerState";

export const useAppState = (
  onDisconnect: (isDisconnected: boolean) => void,
) => {
  const serverState = useServerState();
  const dbsClient = useDBSClient(onDisconnect, serverState);
  const [user, setUser] = useState<DBSSchema["users"]>();
  const { isElectron = false } = serverState ?? {};
  const prglStateWaiting = dbsClient.hasError || dbsClient.isLoading;
  const prglState: PrglReadyState | undefined = useMemo(() => {
    if (prglStateWaiting) return;
    const {
      db: dbs,
      sql: dbsSql,
      methods,
      auth,
      tableSchema,
      socket,
    } = dbsClient;

    const { tables: dbsTables = [] } = getTables(
      (tableSchema ?? []) as DBSchemaTableWithOptions[],
      dbs,
    );
    (window as any).dbs = dbs;
    (window as any).dbsSql = dbsSql;
    (window as any).dbsSocket = socket;
    (window as any).dbsMethods = methods;
    (window as any).auth = auth;
    return {
      dbs: dbs as DBS,
      dbsSql,
      dbsMethods: methods as DBSMethods,
      dbsMethodSchema: dbsClient.methodSchema ?? {},
      dbsTables,
      auth,
      dbsSocket: socket,
      sid: auth.user?.sid,
      dbsKey: Date.now() + "",
      user: auth.user,
      isElectron,
    };
  }, [dbsClient, prglStateWaiting, isElectron]);

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
      serverState,
    };
  }

  return {
    state: prglStateWaiting ? ("loading" as const) : ("ok" as const),
    dbsClientError: undefined,
    prglState,
    serverState,
    user,
  };
};
