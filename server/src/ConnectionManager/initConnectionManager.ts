import { getConnectionApiPaths } from "@common/utils";
import { setHttpAppSecurity } from "@src/init/setHttpAppSecurity";
import type { DB } from "prostgles-server/dist/Prostgles";
import { isDefined } from "prostgles-types";
import { type DBS } from "../index";
import { type ConnectionManager } from "./ConnectionManager";
import { getHotReloadConfigs } from "./getHotReloadConfigs";
import { saveCertificates } from "./saveCertificates";
import { startConnectionOnRequestHandler } from "./startConnectionOnRequestHandler";

export async function initConnectionManager(
  this: ConnectionManager,
  dbs: DBS,
  db: DB,
) {
  this.dbs = dbs;
  this.db = db;

  await this.conSub?.unsubscribe();
  this.conSub = await this.dbs.connections.subscribe({}, {}, (connections) => {
    saveCertificates(connections);
    connections.forEach((updatedConnection) => {
      const prglCon = this.getActiveConnectionSilentFail(updatedConnection.id);
      if (
        !prglCon &&
        (updatedConnection.port || updatedConnection.web_app_directory)
      ) {
        /** Auto start connections that are setup for API or Web app usage */
        void this.startConnection(updatedConnection.id, dbs, db);
        return;
      }
      const currentConnection = this.connections?.find(
        (ccon) => ccon.id === updatedConnection.id,
      );
      if (
        prglCon?.io &&
        currentConnection &&
        currentConnection.url_path !== updatedConnection.url_path
      ) {
        prglCon.io.path(getConnectionApiPaths(updatedConnection).ws);
      }
    });
    this.connections = connections;
  });

  await this.dbConfSub?.unsubscribe();
  this.dbConfSub = await this.dbs.database_configs.subscribe(
    {},
    {
      select: {
        "*": 1,
        connections: { id: 1, is_state_db: 1, port: 1 },
        access_control_user_types: "*",
      },
    },
    async (dbConfigs: typeof this.dbConfigs) => {
      this.dbConfigs = dbConfigs;
      const stateDatabaseConfig = dbConfigs.find((dc) =>
        dc.connections.some((c) => c.is_state_db),
      );
      for (const databaseConfig of dbConfigs) {
        for (const connectionPartialItem of databaseConfig.connections) {
          const prglCon = this.getActiveConnectionSilentFail(
            connectionPartialItem.id,
          );

          const stateConnectionPort = stateDatabaseConfig?.connections
            .map((c) => c.port || undefined)
            .find(isDefined);
          const { is_state_db } = connectionPartialItem;
          const app = is_state_db ? this.dbsServer.app : prglCon?.app;
          if (app && stateDatabaseConfig && stateConnectionPort) {
            setHttpAppSecurity(
              app,
              databaseConfig,
              connectionPartialItem,
              stateConnectionPort,
              this.connectionPorts,
            );
          }

          if (
            stateDatabaseConfig &&
            prglCon?.prgl &&
            !prglCon.con.is_state_db
          ) {
            const connection = await this.getConnectionData(
              connectionPartialItem.id,
            );
            const { config: hotReloadConfig } = await getHotReloadConfigs({
              connectionManager: this,
              connection,
              databaseConfig: databaseConfig,
              stateDatabaseConfig,
              dbs,
              _dbs: db,
            });
            /** Can happen due to error in onMount */
            await prglCon.prgl.update(hotReloadConfig).catch((e) => {
              console.error(
                `Error updating connection ${connection.id} with hot reload config`,
                e,
                { hotReloadConfig },
              );
            });
            await this.setSyncUserSub();
          }
        }
      }
      this.database_configs = dbConfigs;
    },
  );

  startConnectionOnRequestHandler(this);

  await this.accessControlHotReload();
}
