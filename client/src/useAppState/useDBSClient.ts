import {
  useProstglesClient,
  type UseProstglesClientProps,
} from "prostgles-client/dist/prostgles";
import { useEffect, useMemo } from "react";
import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import type { ProstglesState } from "../../../commonTypes/electronInit";
import { API_ENDPOINTS, ROUTES } from "../../../commonTypes/utils";
import type { ClientUser } from "../App";
import { pageReload } from "../components/Loading";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import { playwrightTestLogs } from "../utils";

export const useDBSClient = (
  onDisconnect: (isDisconnected: boolean) => void,
  serverState: ProstglesState | undefined,
) => {
  const clientProps = useMemo(() => {
    if (serverState?.initState.state !== "ok")
      return { skip: true } satisfies UseProstglesClientProps;
    const clientProps: UseProstglesClientProps = {
      socketOptions: {
        transports: ["websocket"],
        path: API_ENDPOINTS.WS_DBS,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
      },
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
    };
    return clientProps;
  }, [onDisconnect, serverState?.initState.state]);

  const dbsClient = useProstglesClient<DBGeneratedSchema, ClientUser>(
    clientProps,
  );

  const socket =
    !dbsClient.hasError && !dbsClient.isLoading && dbsClient.socket;

  useEffect(() => {
    if (!socket) return;

    socket.on("infolog", console.log);
    socket.on("server-restart-request", (_sure) => {
      setTimeout(() => {
        pageReload("server-restart-request");
      }, 2000);
    });
    socket.on("redirect", (newLocation) => {
      window.location = newLocation;
    });
  }, [socket]);

  return dbsClient;
};
