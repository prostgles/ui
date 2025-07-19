import {
  useProstglesClient,
  type DBHandlerClient,
  type UseProstglesClientProps,
} from "prostgles-client/dist/prostgles";
import { useMemoDeep, usePromise } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";
import type { PrglProject, PrglState } from "../../App";
import { getTables } from "../../dashboard/Dashboard/Dashboard";
import { isPlaywrightTest } from "../../i18n/i18nUtils";
import { prgl_R } from "../../WithPrgl";

type PrglProjectStateError = {
  error: any;
  state: "error";
  errorType?: "connNotFound" | "databaseConfigNotFound" | "connectionError";
};
export type PrglProjectState =
  | {
      error?: undefined;
      state: "loading";
    }
  | PrglProjectStateError
  | (PrglProject & {
      /**
       * Used to re-render dashboard on db reconnect
       */
      dbKey?: string;
      error?: undefined;
      loading: false;
      state: "loaded";
    });

type P = {
  connId: string | undefined;
  prglState: PrglState;
};

const onDebug: UseProstglesClientProps["onDebug"] = (ev) => {
  if (
    ev.type === "schemaChanged" ||
    ev.type === "onReady" ||
    ev.type === "onReady.notMounted" ||
    ev.type === "onReady.call"
  ) {
    console.log(
      Date.now(),
      "onDebug",
      ev.type,
      Object.keys(ev.type === "schemaChanged" ? ev.data.schema : ev.data.dbo),
    );
  }
};

export const useProjectDb = ({ prglState, connId }: P): PrglProjectState => {
  const {
    dbsMethods: { startConnection },
    dbs,
  } = prglState;
  const connectionTableHandler = dbs.connections;

  const conState = connectionTableHandler.useSubscribeOne(
    {
      id: connId,
    },
    {
      select: {
        "*": 1,
        database_configs: {
          id: 1,
        },
      },
    },
    { skip: !connId },
  );

  const connectionInfo = useMemoDeep(() => {
    if (conState.isLoading) {
      return {
        state: "loading",
      } as const;
    }
    if (!conState.data) {
      return {
        state: "error",
        errorType: "connNotFound",
        error: `Could not find connection with id: ${connId}`,
      } as const;
    }
    const databaseId = conState.data.database_configs?.[0]?.id;
    if (!databaseId) {
      return {
        state: "error",
        errorType: "databaseConfigNotFound",
        error: `Could not find database config for connection id: ${connId}`,
      } as const;
    }
    return {
      state: "loaded",
      connectionId: conState.data.id,
      connection: conState.data,
      is_state_db: conState.data.is_state_db,
      table_options: conState.data.table_options,
      databaseId,
    } as const;
  }, [conState]);

  const { connectionId } = connectionInfo;
  const pathInfo = usePromise(async () => {
    if (!connectionId) return undefined;
    try {
      const path = await startConnection?.(connectionId);
      if (!path) throw "No path";
      return { path } as const;
    } catch (error) {
      return { error, path: undefined, state: "error" } as const;
    }
  }, [startConnection, connectionId]);

  // const pathInfo = useMemo(() => {
  //   if (!path?.path || connectionInfo.state === "loading") return undefined;
  //   if (connectionInfo.error) {
  //     return {
  //       ...connectionInfo,
  //       path: undefined,
  //       connId,
  //     } as const;
  //   }
  //   return { ...path, connId } as const;
  // }, [path, connectionInfo, connId]);

  const prostglesClientOpts = useMemo(
    () => ({
      socketOptions: {
        path: pathInfo?.path,
        transports: ["websocket"],
        reconnectionDelay: 1000,
        reconnection: true,
      },
      onDebug: isPlaywrightTest ? onDebug : undefined,
      skip: !pathInfo?.path,
    }),
    [pathInfo?.path],
  );

  const dbPrgl = useProstglesClient(prostglesClientOpts);

  const dbState = usePromise(async () => {
    try {
      if (connectionInfo.state === "error") {
        return {
          ...connectionInfo,
          state: "error",
          errorType: "connNotFound",
        } satisfies PrglProjectStateError;
      }
      if (!pathInfo) return;
      if ("error" in dbPrgl) {
        return {
          state: "error",
          error: dbPrgl.error || pathInfo.error || "ErrorUnknown",
          errorType: "connectionError",
        } satisfies PrglProjectStateError;
      }
      if (pathInfo.state === "error") {
        return pathInfo;
      }
      if (dbPrgl.isLoading) return;

      const { path } = pathInfo;
      return {
        path,
        dbPrgl,
        state: "loaded",
        loading: false,
      } as const;
    } catch (error) {
      return {
        error,
        state: "error",
        errorType: "connectionError",
      } satisfies PrglProjectStateError;
    }
  }, [connectionInfo, dbPrgl, pathInfo]);

  const connectionAndTableData = usePromise(async () => {
    const con = conState.data;
    if (
      !dbState ||
      dbState.state !== "loaded" ||
      !con ||
      connectionInfo.state !== "loaded"
    )
      return;
    const { dbo: db, methods, tableSchema, socket } = dbState.dbPrgl;
    const { tables: dbTables = [] } = getTables(
      tableSchema ?? [],
      con.table_options,
      db,
    );

    const { path } = dbState;
    const { dbs, dbsTables } = prglState;
    const { connectionId, databaseId, is_state_db } = connectionInfo;
    const prglProject: PrglProject = {
      dbKey: "db-onReady-" + Date.now(),
      databaseId,
      db: is_state_db ? (dbs as DBHandlerClient) : db,
      tables: is_state_db ? dbsTables : dbTables,
      methods: methods ?? {},
      projectPath: path,
      connectionId,
      connection: con,
    };
    prgl_R.set({
      ...prglProject,
      ...prglState,
    });
    (window as any).db = db;
    (window as any).dbSocket = socket;
    (window as any).dbMethods = methods;
    return prglProject;
  }, [conState.data, dbState, connectionInfo, prglState]);

  if (!dbState || dbState.state !== "loaded") {
    return dbState ?? { state: "loading" };
  }

  if (!connectionAndTableData) {
    return {
      state: "loading",
    } as const;
  }
  return {
    ...dbState,
    ...connectionAndTableData,
  };
};
