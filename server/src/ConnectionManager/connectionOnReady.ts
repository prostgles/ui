import type { SUser } from "@src/authConfig/sessionUtils";
import {
  subscribeToAuthSetupChanges,
  type AuthConfigForStateOrConnection,
} from "@src/authConfig/subscribeToAuthSetupChanges";
import type { DB, OnReadyCallback } from "prostgles-server/dist/initProstgles";
import type { DBS } from "..";
import type { DBSSchema } from "@common/publishUtils";
import { alertIfReferencedFileColumnsRemoved } from "./connectionManagerUtils";
import { pickKeys } from "prostgles-types";
import type { ConnectionManager } from "./ConnectionManager";
import type e from "express";
import { getAuth } from "@src/authConfig/getAuth";
import type { AuthConfig } from "prostgles-server";

export const getConnectionOnReady = ({
  connectionManager,
  dbs,
  _dbs,
  connection: con,
  databaseConfig,
  onSetupReady,
}: {
  connectionManager: ConnectionManager;
  dbs: DBS;
  _dbs: DB;
  databaseConfig: DBSSchema["database_configs"];
  connection: DBSSchema["connections"];
  onSetupReady: () => void;
}) => {
  const { prglConnections } = connectionManager;
  const onReady: OnReadyCallback<void, SUser> = (params) => {
    const { dbo: db, db: _db, reason, tables } = params;

    const newAuthSetupDataListener = subscribeToAuthSetupChanges(
      dbs,
      async (authData) => {
        const auth = await getConnectionAuth(connectionManager.app, dbs, _dbs, {
          ...authData,
          type: "connection",
          url_path: con.url_path || "",
          database_config: databaseConfig,
        });
        void prglConnections[con.id]?.prgl?.update({
          auth,
        });
      },
      prglConnections[con.id]?.authSetupDataListener,
    );
    prglConnections[con.id]!.authSetupDataListener = newAuthSetupDataListener;
    if (prglConnections[con.id]) {
      if (prglConnections[con.id]!.prgl) {
        prglConnections[con.id]!.prgl!._db = _db;
        prglConnections[con.id]!.prgl!.db = db;
      }
      prglConnections[con.id]!.lastRestart = Date.now();
    }
    if (reason.type !== "prgl.restart" && reason.type !== "init") {
      connectionManager.onConnectionReload(con.id, databaseConfig.id);
    }

    void alertIfReferencedFileColumnsRemoved.bind(connectionManager)({
      reason,
      tables,
      connId: con.id,
      db: _db,
    });

    /**
     * In some cases watchSchema does not work as expected (GRANT/REVOKE will not be observable to a less privileged db user)
     */
    const refreshSamedatabaseForOtherUsers = async () => {
      const sameDbs = await dbs.connections.find({
        "id.<>": con.id,
        ...pickKeys(con, ["db_host", "db_port", "db_name"]),
      });
      sameDbs.forEach(({ id }) => {
        if (prglConnections[id]) {
          prglConnections[id].isReady = false;
          void prglConnections[id].prgl?.restart();
        }
      });
    };
    const isNotRecursive = reason.type !== "prgl.restart";
    if (prglConnections[con.id]?.isReady && isNotRecursive) {
      void refreshSamedatabaseForOtherUsers();
    }

    if (prglConnections[con.id]) {
      prglConnections[con.id]!.isReady = true;
    }
    // resolve(socket_path);
    onSetupReady();
    console.log("dbProj ready", con.db_name);
  };
  return onReady;
};

const getConnectionAuth = async (
  app: e.Express,
  dbs: DBS,
  _dbs: DB,
  authData: AuthConfigForStateOrConnection,
) => {
  const auth = await getAuth(app, dbs, authData);
  if (!auth) return;
  // return auth as any;
  return {
    sidKeyName: auth.sidKeyName,
    getUser: (sid, __, _, cl, reqInfo) =>
      auth.getUser(sid, dbs, _dbs, cl, reqInfo),
    cacheSession: {
      getSession: (sid) => auth.cacheSession.getSession(sid, dbs),
    },
  } satisfies AuthConfig<void, SUser>;
};
