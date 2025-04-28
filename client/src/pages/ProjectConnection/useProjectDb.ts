import {
  useProstglesClient,
  type DBHandlerClient,
  type UseProstglesClientProps,
} from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { useMemo } from "react";
import type { PrglProject, PrglState } from "../../App";
import { getTables } from "../../dashboard/Dashboard/Dashboard";
import { isPlaywrightTest } from "../../i18n/i18nUtils";
import { prgl_R } from "../../WithPrgl";

type PrglProjectState =
  | {
      prglProject?: undefined;
      error?: undefined;
      state: "loading";
      connNotFound?: undefined;
    }
  | {
      prglProject?: undefined;
      error: any;
      state: "error";
      connNotFound?: boolean;
    }
  | {
      /**
       * Used to re-render dashboard on db reconnect
       */
      dbKey?: string;
      prglProject: PrglProject;
      error?: undefined;
      loading: false;
      state: "loaded";
      connNotFound?: undefined;
    };

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

  const path = usePromise(async () => {
    if (!connId) return undefined;
    try {
      const path = await startConnection?.(connId);
      if (!path) return undefined;
      return { path, connId };
    } catch (error) {
      return { error, path: undefined, connectionError: true, connId };
    }
  }, [startConnection, connId]);

  const pathInfo = useMemo(() => {
    if (!path) return undefined;
    if (!conState.isLoading && !conState.data) {
      return {
        state: "error",
        error: `Could not find connection id: ${connId}`,
        connNotFound: true,
        path: undefined,
        con: undefined,
        connId,
      };
    }
    if (path.path && conState.data) {
      return { ...path, connId, con: conState.data };
    }
    return undefined;
  }, [path, conState, connId]);

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

  const dashboardDbState: undefined | PrglProjectState =
    usePromise(async () => {
      try {
        if (!pathInfo) return;
        if ("error" in dbPrgl || "connectionError" in pathInfo) {
          return {
            state: "error",
            error: dbPrgl.error || pathInfo.error || "ErrorUnknown",
            connNotFound: false,
            dashboardLoading: false,
          } as const;
        }
        if (!pathInfo.con) {
          return {
            state: "error",
            error: `Could not find connection id: ${connId}`,
            connNotFound: true,
            dashboardLoading: false,
          } as const;
        }
        if (dbPrgl.isLoading) return;

        const { con, path } = pathInfo;
        const { dbo: db, methods, auth, tableSchema, socket } = dbPrgl;
        const { dbs, dbsTables } = prglState;
        // const thisIstheStateDB = auth?.user?.state_db_id === con.id;
        const thisIstheStateDB = con.is_state_db;
        const { tables: dbTables = [] } = getTables(
          tableSchema ?? [],
          con.table_options,
          db,
        );
        const databaseId = con.database_configs?.[0]?.id;
        if (!databaseId) {
          return { state: "error", error: "Dbconf not found" } as const;
        } else {
          const prglProject: PrglProject = {
            dbKey: "db-onReady-" + Date.now(),
            connectionId: con.id,
            connection: con,
            databaseId,
            db: thisIstheStateDB ? (dbs as DBHandlerClient) : db,
            tables: thisIstheStateDB ? dbsTables : dbTables,
            methods: methods ?? {},
            projectPath: path,
          };
          prgl_R.set({
            ...prglProject,
            ...prglState,
          });
          (window as any).db = db;
          (window as any).dbSocket = socket;
          (window as any).dbMethods = methods;
          return {
            prglProject,
            state: "loaded",
            loading: false,
          } as const;
        }
      } catch (error) {
        return { error, state: "error" } as const;
      }
    }, [prglState, dbPrgl, pathInfo, connId]);

  return dashboardDbState ?? { state: "loading" };
};
