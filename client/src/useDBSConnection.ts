
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
import { SPOOF_TEST_VALUE } from "../../commonTypes/utils";

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


  const init = async () => {

    window.document.title = `Prostgles`;
    /**
     * Check if state database is setup
     */
    let serverState: AppState["serverState"];
    try {
      const resp = await fetch("/dbs", { headers: { "x-real-ip": SPOOF_TEST_VALUE } });
      serverState = await resp.json();
      window.document.title = `Prostgles ${serverState?.isElectron? "Desktop" : "UI"}`;
      if(serverState?.connectionError){
        setState({ 
          prglStateErr: undefined,
          serverState,
        });
        return;
      }
    } catch(initError) {
      serverState = {
        ok: false,
        initError,
        isElectron: false,
        canDumpAndRestore: undefined,
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
        socket.on("server-restart-request", _sure => {
          setTimeout(() => {
            pageReload("server-restart-request")
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
            onDebug: (ev) => {
              if(ev.type === "table" && ev.tableName === "global_settings"){
                // if(ev.command === "unsubscribe") debugger;
                console.log(Date.now(), "client", ev);
              }
            },
            onReconnect: () => {
              onDisconnect(false);
              if(window.location.pathname.startsWith("/connections/")){
                pageReload("sync reconnect bug");
              }
            },
            onReady: async (dbs: Partial<DBS>, dbsMethods, tableSchema: any, auth) => {
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
                  isAdminOrSupport: ["admin", "support"].includes(uType),
                  dbsSocket: socket,
                  user: await dbs.users?.findOne({ id: auth.user?.id }),
                  sid: auth.user?.sid,
                });
              }
    
            }
          }).catch(error => {
            resolve({ error })
            
          })
        })
    } else if(!serverState?.connectionError){
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