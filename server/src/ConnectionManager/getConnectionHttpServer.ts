import type { DBSSchema } from "@common/publishUtils";
import { createHttpServer } from "@src/init/createHttpServer";
import { createIOWebsocketServer } from "@src/init/createIOWebsocketServer";
import type { ConnectionManager } from "./ConnectionManager";

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

  const existingServer = this.connectionHttpServers.get(connectionId);
  if (existingServer) {
    if (existingServer.port !== port) {
      this.connectionHttpServers.delete(connectionId);
      this.dbsServer.io.emit("server-restart-request");
      if (existingServer.type !== "reusing_main_server") {
        existingServer.http.close();
      }
    } else {
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
  const connectionServer = { ...newServer, connectionId, port };
  this.connectionHttpServers.set(connectionId, connectionServer);
  return connectionServer;
}
