import { useProstglesClient } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { prgl_R, type PrglProject, type PrglState } from "../../App";
import { getTables } from "../../dashboard/Dashboard/Dashboard";


type PrglProjectState = {
  prglProject?: undefined;
  error?: undefined;
  state: "loading";
  connNotFound?: undefined;
} | {
  prglProject?: undefined;
  error: any;
  state: "error";
  connNotFound?: boolean;
} | {
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

export const useProjectDb = ({ prglState, connId }: P): PrglProjectState => {
  const { dbsMethods: { startConnection } } = prglState;
  const connectionTableHandler = prglState.dbs.connections;
  const pathAndCon = usePromise(async () => {
    const con = await connectionTableHandler.findOne({ id: connId });
    if(!connId) return undefined;
    if(!con) return { error: "Connection not found", path: undefined, con: undefined, connId };
    try {
      const path = await startConnection?.(connId);
      if(!path) return undefined;
      return { path, con, connId };
    } catch (error) {
      return { error, path: undefined, connectionError: true, con, connId };
    }
  }, [startConnection, connId, connectionTableHandler]);

  const dbPrgl = useProstglesClient({
    socketOptions: {
      path: pathAndCon?.path,
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnection: true
    },
    skip: !pathAndCon?.path,
  });

  const dashboardDbState: undefined | PrglProjectState = usePromise(async () => {

    try {
      if("error" in dbPrgl || pathAndCon && "connectionError" in pathAndCon){
        return {
          state: "error", 
          error: dbPrgl.error || pathAndCon?.error || "ErrorUnknown", 
          connNotFound: false, 
          dashboardLoading: false,
        } as const;
      }
      if(pathAndCon && !pathAndCon.con){
        return { 
          state: "error", 
          error: `Could not find connection id: ${pathAndCon.connId}`, 
          connNotFound: true, 
          dashboardLoading: false,
        } as const;
      }
      if(dbPrgl.isLoading || !pathAndCon) return;
      const { con, path } = pathAndCon;
      const { dbo: db, methods, auth, tableSchema } = dbPrgl;
      const { dbs, dbsTables } = prglState;     
      const thisIstheStateDB = auth?.user?.state_db_id === con.id;
      const { tables : dbTables = [], error } =  await getTables(tableSchema ?? [], undefined, db);
      const dbConf = await dbs.database_configs.findOne({ $existsJoined: { connections: { id: con.id } } });
      if(!dbConf){
        return { state: "error", error: "Dbconf not found" }  as const
      } else if(error){
        return { error, state: "error", } as const
      } else {
        const prglProject: PrglProject = {
          dbKey: "db-onReady-" + Date.now(),
          connectionId: con.id,
          connection: con,
          databaseId: dbConf.id,
          db: thisIstheStateDB ? (dbs as any) : db,
          tables: thisIstheStateDB ? dbsTables : dbTables,
          methods: methods ?? {},
          projectPath: path,
        };
        prgl_R.set({ 
          ...prglProject,
          ...prglState,
        });
        (window as any).db = db;
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
  }, [prglState, dbPrgl, pathAndCon]);
  
  return dashboardDbState ?? { state: "loading" };
}