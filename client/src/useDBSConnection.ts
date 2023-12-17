
import prostgles from  "prostgles-client";
import io from "socket.io-client"; 
import { useState } from "react";
import { AppState } from "./App";
import { useEffectAsync } from "./dashboard/DashboardMenu/DashboardMenuSettings";
import { _Dashboard } from "./dashboard/Dashboard/Dashboard"; 
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated"; 
import { DBS } from "./dashboard/Dashboard/DBS";
import { DBSSchema } from "@common/publishUtils";
import { tryCatch } from "prostgles-types"; 

export const useDBSConnection = (onDisconnect: (isDisconnected: boolean) => void) => {

  const [state, setState] = useState<Pick<AppState, "serverState" | "prglState" | "prglStateErr" | "dbsKey">>();
  const [user, setUser] = useState<DBSSchema["users"]>();
  const { dbs, auth } = state?.prglState ?? {};
  useEffectAsync(async () => {
    if(!dbs || !auth?.user?.id) return;
     
    const userSub = await dbs.users.subscribeOne({ id: auth.user!.id }, {}, (user) => {
      setUser(user);
    });

    return userSub.unsubscribe;

  }, [dbs, auth])

  const init = async () => {

    window.document.title = `Prostgles`;
    /**
     * Check if state database is setup
     */
    let serverState: AppState["serverState"];
    try {
      const resp = await fetch("/dbs");
      serverState = await resp.json();
      window.document.title = `Prostgles ${serverState?.isElectron? "Desktop" : "UI"}`;
    } catch(initError) {
      serverState = {
        ok: false,
        initError,
        isElectron: false,
        canDumpAndRestore: undefined,
        isDemoMode: false,
      }
      console.error(initError)
    }
     
    let prglReady: AppState["prglState"] | { error: any };
    let socket: SocketIOClient.Socket;
    if(serverState?.isElectron && !serverState.electronCredsProvided){
      setState({
        serverState,
      });
      return;
    } else if(serverState?.ok){
      socket = io(
          // "http://localhost:3004", 
        {
          // host: ,
          transports: ["websocket"],
          path: "/iosckt", //"/pipi",
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
        });

        socket.on("infolog", console.log);
        socket.on("pls-restart", _sure => {
          setTimeout(() => window.location.reload(), 2000)
        });
        socket.on("redirect", newLocation => {
          window.location = newLocation;
        });

        prglReady = await new Promise((resolve, _reject) => {

          prostgles<DBSchemaGenerated>({
            socket,
            onDisconnect: () => {
              onDisconnect(true);
            },
            // onDebug: (ev) => {
            //   if(ev.type !== "method" && ev.tableName === "windows"){
            //     console.log(Date.now(), "client", ev);
            //   }
            // },
            onReconnect: () => {
              setState(currState => {
                const newState = { 
                  ...currState, 
                  dbsKey: "dbs" + Date.now(),
                }; 
                return newState;
              });
              onDisconnect(false);
            },
            onReady: async (dbs: Partial<DBS>, dbsMethods, tableSchema: any, auth = {} ) => { 
              (window as any).dbs = dbs;
              (window as any).dbsSocket = socket;
              (window as any).dbsMethods = dbsMethods;
              const uType = auth.user?.type; 
    
              const { tables: dbsTables = [], error } = await  await _Dashboard.getTables(tableSchema ?? [], undefined, dbs as any);
              if(error){
                resolve({ error });
              } else {
                resolve({ 
                  dbs: dbs as any, 
                  dbsMethods, 
                  dbsTables,
                  auth,
                  isAdminOrSupport: ["admin", "support"].includes(uType as any),
                  dbsSocket: socket,
                  user: await dbs.users?.findOne({ id: auth.user?.id }),
                });
              }
    
            }
          }).catch(error => {
            resolve({ error })
            
          })
        })

    } else {
      /** Maybe loading, try again */
      console.warn("Prostgles could not connect. Retrying in 1 second")
      setTimeout(() => {
        init();
      }, 1000)
    }

    if(!prglReady){

    } else if("error" in prglReady){
      setState({ 
        prglStateErr: prglReady.error,
        serverState,
      });
    } else {
      setState({
        dbsKey: Date.now() + "",
        prglState: prglReady,
        serverState,
      });
    }
    

  }

  useEffectAsync(async () => {
    init();
  }, []);

  return {
    ...state, 
    ...(state?.prglState? {
      prglState: {
        ...state.prglState,
        user,
      }
    } : {}),
  };
}