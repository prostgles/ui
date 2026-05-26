import type { DB } from "prostgles-server/dist/Prostgles";
import { pickKeys, tryCatchV2 } from "prostgles-types";
import type { DBS } from "..";
import type { DBSConnectionInfo } from "../electronConfig";
import { tableConfig } from "../tableConfig/tableConfig";
import { upsertConnection } from "../upsertConnection";
import { CSP_DEFAULTS } from "./CSP_DEFAULTS";

/** Add state db if missing */
export const insertStateDatabase = async (
  db: DBS,
  _db: DB,
  con: DBSConnectionInfo,
  port: number,
  isElectron: boolean,
) => {
  /** Update changed passwords */
  await db.connections.update(
    pickKeys(con, ["db_host", "db_port", "db_user"]),
    pickKeys(con, ["db_pass", "db_conn", "db_ssl"]),
  );
  const matchingStateConnections = await db.connections.find(
    pickKeys(con, ["db_name", "db_host", "db_port", "db_user"]),
  );

  if (!matchingStateConnections.length) {
    const { data: state_db, error } = await tryCatchV2(async () => {
      const { connection: state_db, database_config } = await upsertConnection(
        {
          ...con,
          user_id: null,
          port,
          name: isElectron ? "Prostgles Desktop state" : "Prostgles UI state",
          type: !con.db_conn ? "Standard" : "Connection URI",
          db_port: con.db_port || 5432,
          db_ssl: con.db_ssl,
          is_state_db: true,
        },
        null,
        db,
        ["*"],
      );

      /**
       * Required to ensure xenova/transformators works
       */
      // const localLLMHeaders = `'unsafe-eval' 'wasm-unsafe-eval'`;
      await db.database_configs.update(
        { id: database_config.id },
        {
          allowed_ips_enabled: false,
          allowed_ips: ["::ffff:127.0.0.1"],
          tableConfig,
          csp: CSP_DEFAULTS,
          cors_csp_devmode_enabled: true,
        },
      );

      return state_db;
    });

    if (error) {
      console.error("Failed to insert state database", error);
      throw error;
    } else {
      console.log("Inserted state database ", state_db?.db_name);
    }
    if (!state_db) throw "state_db not found";
  } else {
    await db.connections.update({ is_state_db: true }, { port });
  }
};
