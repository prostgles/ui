import prostgles from "prostgles-client";
import {
  type DBHandlerClient,
  useAsyncEffectQueue,
} from "prostgles-client/dist/prostgles";
import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import io from "socket.io-client";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import {
  API_ENDPOINTS,
  ROUTES,
  SPOOF_TEST_VALUE,
} from "../../../commonTypes/utils";
import type { AppState } from "../App";
import { pageReload } from "../components/Loading";
import type { DBS } from "../dashboard/Dashboard/DBS";
import { getTables } from "../dashboard/Dashboard/Dashboard";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import { playwrightTestLogs } from "../utils";
import { dbsConnectionOptions } from "./dbsConnectionOptions";

export const useDBSConnection = (
  onDisconnect: (isDisconnected: boolean) => void,
) => {
  const [state, setState] =
    useState<
      Pick<AppState, "serverState" | "prglState" | "prglStateErr" | "dbsKey">
    >();
  const [user, setUser] = useState<DBSSchema["users"]>();
  const { dbs, auth } = state?.prglState ?? {};

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

  const init = async () => {
    window.document.title = `Prostgles`;
    /**
     * Check if state database is setup
     */
    let serverState: AppState["serverState"];
    try {
      const resp = await fetch("/dbs", {
        headers: { "x-real-ip": SPOOF_TEST_VALUE },
      });
      serverState = await resp.json();
      window.document.title = `Prostgles ${serverState?.isElectron ? "Desktop" : "UI"}`;
      if (serverState?.initState.state === "error") {
        setState({
          prglStateErr: undefined,
          serverState,
        });
        return;
      }
    } catch (initError) {
      serverState = {
        initState: {
          state: "error",
          error: initError,
          errorType: "init",
        },
        isElectron: false,
        canDumpAndRestore: undefined,
      };
      console.error(initError);
    }

    let prglReady: AppState["prglState"] | { error: any };
    let socket: Socket;
    if (serverState?.isElectron && !serverState.electronCredsProvided) {
      setState({
        serverState,
      });
      return;
    } else if (serverState?.initState.state === "ok") {
      socket = io({
        transports: ["websocket"],
        path: API_ENDPOINTS.WS_DBS,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
      });

      socket.on("infolog", console.log);
      socket.on("server-restart-request", (_sure) => {
        setTimeout(() => {
          pageReload("server-restart-request");
        }, 2000);
      });
      socket.on("redirect", (newLocation) => {
        window.location = newLocation;
      });

      prglReady = await new Promise((resolve, _reject) => {
        prostgles<DBGeneratedSchema>({
          socket,
          onDisconnect: () => {
            onDisconnect(true);
          },
          onDebug: !isPlaywrightTest ? undefined : playwrightTestLogs,
          onReconnect: () => {
            onDisconnect(false);
            if (window.location.pathname.startsWith(ROUTES.DASHBOARD + "/")) {
              pageReload("sync reconnect bug");
            }
          },
          onReady: async (
            dbs: Partial<DBS>,
            dbsMethods,
            tableSchema: any,
            auth,
          ) => {
            (window as any).dbs = dbs;
            (window as any).dbsSocket = socket;
            (window as any).dbsMethods = dbsMethods;
            (window as any).auth = auth;
            const uType = auth.user?.type;
            const { tables: dbsTables = [] } = getTables(
              tableSchema ?? [],
              dbsConnectionOptions.table_options,
              dbs as DBHandlerClient,
              true,
            );

            resolve({
              dbs: dbs as DBS,
              dbsMethods,
              dbsTables,
              auth,
              isAdminOrSupport: ["admin", "support"].includes(uType),
              dbsSocket: socket,
              user: await dbs.users?.findOne({ id: auth.user?.id }),
              sid: auth.user?.sid,
            });
          },
        }).catch((error) => {
          resolve({ error });
        });
      });
    } else if (serverState?.initState.state !== "error") {
      /** Maybe loading, try again */
      console.warn("Prostgles could not connect. Retrying in 1 second");
      setTimeout(() => {
        init();
      }, 1000);
    }

    if (!prglReady) {
    } else if ("error" in prglReady) {
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
  };

  useEffect(() => {
    init();
  }, []);

  return {
    ...state,
    ...(state?.prglState ?
      {
        prglState: {
          ...state.prglState,
          user,
        },
      }
    : {}),
  };
};
