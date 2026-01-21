import type { DBSSchema } from "@common/publishUtils";
import { createHttpServer } from "@src/init/createHttpServer";
import { createIOWebsocketServer } from "@src/init/createIOWebsocketServer";
import type { ConnectionManager } from "./ConnectionManager";
import { isEqual, pickKeys } from "prostgles-types";

export function getConnectionHttpServer(
  this: ConnectionManager,
  {
    connection,
    databaseConfig,
    socketPath,
  }: {
    connection: DBSSchema["connections"];
    databaseConfig: DBSSchema["database_configs"];
    socketPath: string;
  },
) {
  const { id: connectionId, is_state_db } = connection;
  const port = connection.port || undefined;
  const { http, app } = this.dbsServer;
  const allowedOrigin = databaseConfig.allowed_origin || undefined;
  const existingServer = this.connectionHttpServers.get(connectionId);
  if (existingServer) {
    if (
      !isEqual(
        pickKeys(existingServer, ["allowedOrigin", "port", "socketPath"]),
        {
          port,
          socketPath,
          allowedOrigin,
        },
      )
    ) {
      this.connectionHttpServers.delete(connectionId);
      this.dbsServer.io.emit("server-restart-request");
      if (existingServer.type !== "reusing_main_server") {
        existingServer.http.close();
      }
      console.log(
        `${databaseConfig.db_name}: Connection ${connectionId} port changed, restarting server`,
      );
    } else {
      console.log(
        `${databaseConfig.db_name}: Reusing existing server for connection ${connectionId}`,
      );
      return existingServer;
    }
  }

  const newServer =
    is_state_db || !port ?
      {
        type: "reusing_main_server" as const,
        app,
        http,
        ...createIOWebsocketServer({
          http,
          allowedOrigin: databaseConfig.allowed_origin,
          socketPath,
        }),
      }
    : createHttpServer({
        port,
        allowedOrigin: databaseConfig.allowed_origin,
        socketPath,
      });
  const connectionServer = {
    ...newServer,
    connectionId,
    port,
    socketPath,
    allowedOrigin,
  };
  this.connectionHttpServers.set(connectionId, connectionServer);
  return connectionServer;
}
