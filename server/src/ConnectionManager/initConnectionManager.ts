import { API_ENDPOINTS, getConnectionPaths } from "@common/utils";
import type { DB } from "prostgles-server/dist/Prostgles";
import { tout, type DBS } from "../index";
import {
  getHotReloadConfigs,
  type ConnectionManager,
} from "./ConnectionManager";
import { saveCertificates } from "./saveCertificates";

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
      const prglCon = this.prglConnections[updatedConnection.id];
      const currentConnection = this.connections?.find(
        (ccon) => ccon.id === updatedConnection.id,
      );
      if (
        prglCon?.io &&
        currentConnection &&
        currentConnection.url_path !== updatedConnection.url_path
      ) {
        prglCon.io.path(getConnectionPaths(updatedConnection).ws);
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
        connections: { id: 1 },
        access_control_user_types: "*",
      },
    },
    async (dbConfigs: typeof this.dbConfigs) => {
      this.dbConfigs = dbConfigs;
      for (const conf of dbConfigs) {
        for (const c of conf.connections) {
          const prglCon = this.prglConnections[c.id];
          if (prglCon?.prgl && !prglCon.con.is_state_db) {
            const con = await this.getConnectionData(c.id);
            const hotReloadConfig = await getHotReloadConfigs(
              this,
              con,
              conf,
              dbs,
            );
            /** Can happen due to error in onMount */
            await prglCon.prgl.update(hotReloadConfig).catch((e) => {
              console.error(
                `Error updating connection ${con.id} with hot reload config`,
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

  /** Start connections if accessed. TODO This should be a 404 error request handler */
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  this.app.use(async (req, res, next) => {
    const { url } = req;
    if (this.dbs && this.db && this.connections) {
      let validOfflineConnectionId: string | undefined;

      const connectionIdOrPath = url.split("/")[2];
      if (
        connectionIdOrPath &&
        (url.startsWith(API_ENDPOINTS.WS_DB) ||
          url.startsWith(API_ENDPOINTS.REST))
      ) {
        validOfflineConnectionId = this.connections.find(
          (c) =>
            !this.prglConnections[c.id] &&
            [c.id, c.url_path].includes(connectionIdOrPath),
        )?.id;
      }
      if (validOfflineConnectionId) {
        await this.startConnection(validOfflineConnectionId, this.dbs, this.db);
        await tout(1000);
        return res.redirect(307, req.originalUrl);
      }
    }
    next();
  });

  await this.accessControlHotReload();
}
