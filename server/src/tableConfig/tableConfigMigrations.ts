import { migrateColumnConfig, type MigratableColumn } from "./migrateColumnConfig";
import type { TableConfigMigrations } from "prostgles-server/dist/ProstglesTypes";
import type { DBSConnectionInfo } from "../electronConfig";

export const getTableConfigMigrations = (stateConnection: DBSConnectionInfo) =>
  ({
    silentFail: false,
    version: 7,
    onMigrate: async ({ db, oldVersion }) => {
      console.warn("Migrating from version: ", oldVersion);
      if (oldVersion !== undefined && oldVersion < 7) {
        const windows = await db.any<{ id: string; columns: MigratableColumn[] }>(
          `SELECT id, columns FROM windows WHERE jsonb_typeof(columns) = 'array'`,
        );
        for (const window of windows) {
          const columns = window.columns.map((column) => migrateColumnConfig(column));
          if (columns.some((column, index) => column !== window.columns[index])) {
            await db.none(`UPDATE windows SET columns = $1::jsonb WHERE id = $2`, [JSON.stringify(columns), window.id]);
          }
        }
      }
      if (oldVersion === 3) {
        await db.any(`
              UPDATE login_attempts 
                SET ip_address_remote = COALESCE(ip_address_remote, ''),
                  user_agent = COALESCE(user_agent, ''),
                  x_real_ip = COALESCE(x_real_ip, '')
              WHERE ip_address_remote IS NULL 
              OR user_agent IS NULL 
              OR x_real_ip IS NULL
            `);
      } else if (oldVersion === 4) {
        await db.any(`
              UPDATE llm_messages
              SET message = jsonb_build_array(jsonb_build_object('type', 'text', 'text', message)) 
              WHERE message IS NOT NULL
            `);
      }

      if (oldVersion !== undefined && oldVersion < 6) {
        await db.any(
          `
          WITH current_state_connection AS (
            SELECT id
            FROM connections
            WHERE is_state_db = TRUE
              AND db_name = COALESCE(\${db_name}, 'postgres')
              AND db_host = COALESCE(\${db_host}, 'localhost')
              AND db_port = COALESCE(\${db_port}, 5432)
              AND db_user = COALESCE(\${db_user}, 'postgres')
            ORDER BY created, id
            LIMIT 1
          )
          UPDATE connections
          SET is_state_db = FALSE, port = NULL
          WHERE is_state_db = TRUE
            AND id IS DISTINCT FROM (SELECT id FROM current_state_connection)
        `,
          stateConnection,
        );
      }
    },
  }) satisfies TableConfigMigrations;
