import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import type { ProstglesState } from "@common/electronInitTypes";
import { API_ENDPOINTS, ROUTES } from "@common/utils";
import { pageReload } from "@components/Loader/Loading";
import {
  useProstglesClient,
  type UseProstglesClientProps,
} from "prostgles-client/dist/prostgles";
import { useEffect, useMemo } from "react";
import type { DBSMethods } from "src/dashboard/Dashboard/DBS";
import type { ClientUser } from "../App";
import { isPlaywrightTest } from "../i18n/i18nUtils";
import { playwrightTestLogs } from "../utils/utils";

const onDebugUseWspSync: UseProstglesClientProps["onDebug"] = (ev) => {
  // if (
  //   ev.type === "table" &&
  //   ev.command === "getSync" &&
  //   ev.tableName === "workspaces"
  // ) {
  //   console.warn(Date.now(), ev.type, ev.command, ev.data.filter);
  // }
  // if (ev.type === "sync" && ev.tableName === "workspaces") {
  //   if (
  //     ev.command !== "notifySubscribers" &&
  //     ev.command !== "onPullRequest" &&
  //     ev.command !== "create" &&
  //     ev.command !== "onSyncRequest" &&
  //     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //     ev.command !== "onUpdates"
  //   ) {
  //     return;
  //   }
  //   if (!syncTableSet.has(ev.options)) {
  //     syncTableSet.add(ev.options);
  //   }
  //   console.log(
  //     Date.now(),
  //     ev.command,
  //     ev.options.filter,
  //     ev.data,
  //     ev.channelName,
  //     // Array.from(syncTableSet.values()).map((t) => [t.filter, t.getItems()]),
  //   );
  // }
};
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
      onDebug: !isPlaywrightTest ? onDebugUseWspSync : playwrightTestLogs,
      onReconnect: () => {
        onDisconnect(false);
        if (window.location.pathname.startsWith(ROUTES.CONNECTIONS + "/")) {
          void pageReload("sync reconnect bug");
        }
      },
    };
    return clientProps;
  }, [onDisconnect, serverState?.initState.state]);

  const dbsClient = useProstglesClient<
    DBGeneratedSchema,
    DBSMethods,
    ClientUser
  >(clientProps);

  const socket =
    !dbsClient.hasError && !dbsClient.isLoading && dbsClient.socket;

  useEffect(() => {
    if (!socket) return;

    socket.on("infolog", console.log);
    socket.on("server-restart-request", (withDelay) => {
      setTimeout(
        () => {
          void pageReload("server-restart-request");
        },
        withDelay ? 200 : 0,
      );
    });
    socket.on("redirect", (newLocation) => {
      if (typeof newLocation !== "string") return;
      window.location.href = newLocation;
    });
  }, [socket]);

  return dbsClient;
};
