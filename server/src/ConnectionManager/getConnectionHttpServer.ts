import type { DBSSchema } from "@common/publishUtils";
import { createHttpServer } from "@src/createHttpAndIOServers/createHttpServer";
import { createIOWebsocketServer } from "@src/createHttpAndIOServers/createIOWebsocketServer";
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
    web_app_directory,
    web_app_templated,
    id,
  } = connection;
  const {
    cors,
    csp,
    cors_csp_devmode_enabled,
    trust_proxy,
    csp_add_defaults_enabled,
  } = databaseConfig;
  const config = {
    id,
    port,
    cors,
    csp,
    csp_add_defaults_enabled,
    cors_csp_devmode_enabled,
    socketPath,
    web_app_directory,
    web_app_templated,
    trust_proxy,
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
        ...createIOWebsocketServer(
          {
            http,
            socketPath,
            cors,
            cors_csp_devmode_enabled,
          },
          { is_state_db, port },
          this.dbsServer.port,
        ),
      }
    : createHttpServer(
        {
          ...config,
          port,
          stateAppPort: this.dbsServer.port,
          is_state_db,
          connectionPorts: this.connectionPorts,
        },
        this.dbsServer.app,
      );
  const connectionServer = {
    ...newServer,
    connectionId,
    config,
  };
  this.connectionHttpServers.set(connectionId, connectionServer);
  return connectionServer;
}
