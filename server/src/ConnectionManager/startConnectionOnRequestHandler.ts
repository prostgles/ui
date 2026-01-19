import type { RequestHandler } from "express";
import { API_ENDPOINTS, ROUTES } from "@common/utils";
import { match } from "path-to-regexp";
import { upsertNamedExpressMiddleware } from "prostgles-server/dist/Auth/utils/upsertNamedExpressMiddleware";
import type { ConnectionManager } from "./ConnectionManager";
import { tout } from "@src/utils/tout";

export const startConnectionOnRequestHandler = ({
  connections,
  db,
  dbs,
  startConnection,
  prglConnections,
  dbsServer,
}: ConnectionManager) => {
  const onConnectionRequestedHandler: RequestHandler = async (
    req,
    res,
    next,
  ) => {
    const { url } = req;
    if (dbs && db && connections) {
      const matchers = [
        ROUTES.CONNECTIONS,
        ROUTES.CONFIG,
        API_ENDPOINTS.WS_DB,
        API_ENDPOINTS.REST,
      ].map((route) =>
        match<{ connectionId: string }>(route + "/:connectionId", {
          end: false,
        }),
      );

      let validOfflineConnectionId: string | undefined;

      // const connectionIdOrPath = url.split("/")[2];
      const connectionIdOrPath = matchers
        .map((m) => m(url))
        .find((res) => res !== false)?.params.connectionId;
      if (connectionIdOrPath) {
        validOfflineConnectionId = connections.find(
          (c) =>
            !prglConnections.get(c.id) &&
            [c.id, c.url_path].includes(connectionIdOrPath),
        )?.id;
      }
      if (validOfflineConnectionId) {
        await startConnection(validOfflineConnectionId, dbs, db);
        await tout(1000);
        return res.redirect(307, req.originalUrl);
      }
    }
    next();
  };

  /** Start connections if accessed. TODO This should be a 404 error request handler */
  upsertNamedExpressMiddleware(
    dbsServer.app,
    onConnectionRequestedHandler,
    "onConnectionRequestedHandler",
  );
};
