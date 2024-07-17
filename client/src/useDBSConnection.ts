
import prostgles from "prostgles-client";
import { useAsyncEffectQueue } from "prostgles-client/dist/prostgles";
import { useState } from "react";
import type { Socket } from "socket.io-client";
import io from "socket.io-client";
import type { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../commonTypes/publishUtils";
import type { AppState } from "./App";
import type { DBS } from "./dashboard/Dashboard/DBS";
import { getTables } from "./dashboard/Dashboard/Dashboard";
import { useEffectAsync } from "./dashboard/DashboardMenu/DashboardMenuSettings";
import { pageReload } from "./components/Loading";

export const useDBSConnection = (onDisconnect: (isDisconnected: boolean) => void) => {

  const [state, setState] = useState<Pick<AppState, "serverState" | "prglState" | "prglStateErr" | "dbsKey">>();
  const [user, setUser] = useState<DBSSchema["users"]>();
  const { dbs, auth } = state?.prglState ?? {};
  useAsyncEffectQueue(async () => {
    if(!dbs || !auth?.user?.id) return;
    
    const userSub = await dbs.users.subscribeOne({ id: auth.user.id }, {}, (user) => {
      setUser(user);
    });

    return userSub.unsubscribe;

  }, [dbs, auth])
  // const user = dbs?.users.useSubscribeOne({ id: auth?.user!.id });


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
    let socket: Socket;
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
          setTimeout(() => {
            pageReload("pls-restart")
          }, 2000)
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
              /** This might not be needed */
              // setState(currState => {
              //   const newState = { 
              //     ...currState, 
              //     dbsKey: "dbs" + Date.now(),
              //   }; 
              //   return newState;
              // });
              onDisconnect(false);
            },
            onReady: async (dbs: Partial<DBS>, dbsMethods, tableSchema: any, auth = {}, isReconnect) => {
              window.console.log({ isReconnect }); 
              (window as any).dbs = dbs;
              (window as any).dbsSocket = socket;
              (window as any).dbsMethods = dbsMethods;
              const uType = auth.user?.type; 
    
              const { tables: dbsTables = [], error } = await getTables(tableSchema ?? [], undefined, dbs as any);
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