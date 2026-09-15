import type { DBSSchema } from "@common/publishUtils";
import type { SUser } from "@src/authConfig/sessionUtils";
import type { ProstglesContext } from "@src/schemaConfig";
import type { OnReadyCallback } from "prostgles-server/dist/initProstgles";
import { pickKeys } from "prostgles-types";
import type { DBS } from "..";
import type { ConnectionManager } from "./ConnectionManager";
import { alertIfReferencedFileColumnsRemoved } from "./connectionManagerUtils";

export const getConnectionOnReady = ({
  connectionManager,
  dbs,
  connection: con,
  databaseConfig,
  onSetupReady,
}: {
  connectionManager: ConnectionManager;
  dbs: DBS;
  databaseConfig: DBSSchema["database_configs"];
  connection: DBSSchema["connections"];
  onSetupReady: () => void;
}) => {
  const onReady: OnReadyCallback<void, SUser, ProstglesContext> = (params) => {
    const { dbo: db, db: _db, reason, tables } = params;

    let maybeActiveConnection = connectionManager.getActiveConnectionSilentFail(
      con.id,
    );
    if (maybeActiveConnection) {
      maybeActiveConnection.prgl._db = _db;
      maybeActiveConnection.prgl.db = db;
      maybeActiveConnection.lastRestart = Date.now();
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
        id: { "<>": con.id },
        ...pickKeys(con, ["db_host", "db_port", "db_name"]),
      });
      sameDbs.forEach(({ id }) => {
        const maybeActiveConnection =
          connectionManager.getActiveConnectionSilentFail(id);
        if (maybeActiveConnection) {
          maybeActiveConnection.isReady = false;
          void maybeActiveConnection.prgl.restart();
        }
      });
    };
    const isNotRecursive = reason.type !== "prgl.restart";
    maybeActiveConnection = connectionManager.getActiveConnectionSilentFail(
      con.id,
    );
    if (maybeActiveConnection?.isReady && isNotRecursive) {
      void refreshSamedatabaseForOtherUsers();
    }

    if (maybeActiveConnection) {
      maybeActiveConnection.isReady = true;
    }
    onSetupReady();
    console.log("dbProj ready", con.db_name);
  };
  return onReady;
};
