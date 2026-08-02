import { fromEntries, getConnectionApiPaths } from "@common/utils";
import { setHttpAppSecurity } from "@src/createHttpAndIOServers/setHttpAppSecurity";
import type { DB } from "prostgles-server/dist/Prostgles";
import { getSerialisableError, isDefined } from "prostgles-types";
import { type DBS } from "../index";
import { type ConnectionManager } from "./ConnectionManager";
import { getHotReloadConfigs } from "./getHotReloadConfigs";
import { saveCertificates } from "./saveCertificates";
import { startConnectionOnRequestHandler } from "./startConnectionOnRequestHandler";
import type { DBSSchema } from "@common/publishUtils";

export const CONNECTION_HOT_RELOAD_COLUMNS = [
  "id",
  "name",
  "url_path",
  "port",
  "is_state_db",
  "web_app_directory",
  "web_app_templated",
  "db_name",
  "db_host",
  "db_port",
  "db_schema_filter",
  "db_watch_schema",
  "table_options",
  "display_options",
] as const satisfies readonly (keyof DBSSchema["connections"])[];

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
        void this.startConnection(updatedConnection.id, dbs, db).catch((e) => {
          throw new Error(
            `Error auto starting connection ${JSON.stringify(updatedConnection.name)} on server start: ` +
              JSON.stringify(getSerialisableError(e)),
          );
        });
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
  const dbConfColumnListSelect = fromEntries(
    (await this.dbs.database_configs.getColumns())
      .filter((c) => !c.name.includes("table_schema_"))
      .map((c) => [c.name as keyof DBSSchema["database_configs"], 1] as const),
  );
  this.dbConfSub = await this.dbs.database_configs.subscribe(
    {},
    {
      select: {
        ...dbConfColumnListSelect,
        connections: CONNECTION_HOT_RELOAD_COLUMNS.reduce(
          (a, name) => ({ ...a, [name]: 1 }),
          {},
        ), //{ id: 1, is_state_db: 1, port: 1 },
        access_control_user_types: "*",
        published_methods: "*",
      },
    },
    //@ts-ignore
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
            const { config: hotReloadConfig } = await getHotReloadConfigs({
              connectionManager: this,
              connection: connectionPartialItem,
              databaseConfig: databaseConfig,
              stateDatabaseConfig,
              dbs,
              _dbs: db,
              connectionInfo: prglCon.connectionInfo,
            });
            /** Can happen due to error in onMount */
            await prglCon.prgl.update(hotReloadConfig).catch((e) => {
              console.error(
                `Error updating connection ${connectionPartialItem.id} with hot reload config`,
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
