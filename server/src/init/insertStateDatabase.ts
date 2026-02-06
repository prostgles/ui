import type { DB } from "prostgles-server/dist/Prostgles";
import { pickKeys, tryCatchV2 } from "prostgles-types";
import type { DBS } from "..";
import type { DBSConnectionInfo } from "../electronConfig";
import { upsertConnection } from "../upsertConnection";
import { getPasswordlessAdmin } from "@src/init/initUsers";
import { tableConfig } from "../tableConfig/tableConfig";

/** Add state db if missing */
export const insertStateDatabase = async (
  db: DBS,
  _db: DB,
  con: DBSConnectionInfo,
  port: number,
  isElectron: boolean,
) => {
  const matchingStateConnectionCount = await db.connections.count(
    pickKeys(con, ["db_name", "db_host", "db_port", "db_user"]),
  );
  if (!matchingStateConnectionCount) {
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
          csp: {
            defaultSrc: ["'self'"],
            imgSrc: [
              "*",
              "'self'",
              "data:",
              "blob:",
              "https://*.tile.openstreetmap.org",
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"], // localLLMHeaders
            /* data import (papaparse) requires: worker-src blob: 'self' */
            workerSrc: ["'self'", "blob:"],
            frameSrc: [
              "self",
              /** Allow rendering pdf in AskLLM chat */
              "data:",
              "blob:",
            ],
            connectSrc: ["'self'", "ws:", "wss:"],
          },
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
