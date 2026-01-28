import type { DBSSchema } from "@common/publishUtils";
import { createHttpServer } from "@src/init/createHttpServer";
import { createIOWebsocketServer } from "@src/init/createIOWebsocketServer";
import { isEqual } from "prostgles-types";
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
  const {
    id: connectionId,
    is_state_db,
    port,
    web_app_directory: webAppDirectory,
    web_app_templated: webAppTemplated,
  } = connection;
  const { allowed_origin: allowedOrigin, trust_proxy: trustProxy } =
    databaseConfig;
  const config = {
    port,
    allowedOrigin,
    trustProxy,
    socketPath,
    webAppDirectory,
    webAppTemplated,
  };
  const { http, app } = this.dbsServer;
  const existingServer = this.connectionHttpServers.get(connectionId);
  if (existingServer) {
    const isReusingState = existingServer.type === "reusing_main_server";

    if (!isEqual(existingServer.config, config)) {
      if (
        isReusingState &&
        existingServer.config.port === port &&
        existingServer.config.socketPath === socketPath
      ) {
        throw new Error(
          "TODO: swap socketio with wss to hot reload config without problems",
        );
      }
      this.connectionHttpServers.delete(connectionId);
      this.dbsServer.io.emit("server-restart-request");
      if (!isReusingState) {
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
          allowedOrigin,
          socketPath,
        }),
      }
    : createHttpServer({ ...config, port });
  const connectionServer = {
    ...newServer,
    connectionId,
    config,
  };
  this.connectionHttpServers.set(connectionId, connectionServer);
  return connectionServer;
}
