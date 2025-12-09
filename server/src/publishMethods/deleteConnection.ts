import { getCDB } from "@src/ConnectionManager/ConnectionManager";
import { connMgr, type DBS } from "..";
import type BackupManager from "@src/BackupManager/BackupManager";

export const deleteConnection = async (
  dbs: DBS,
  bkpManager: BackupManager,
  id: string,
  opts?: { keepBackups: boolean; dropDatabase: boolean },
) => {
  try {
    return dbs.tx(async (t) => {
      const con = await t.connections.findOne({ id });
      if (con?.is_state_db)
        throw "Cannot delete a prostgles state database connection";
      connMgr.prglConnections[id]?.methodRunner?.destroy();
      connMgr.prglConnections[id]?.onMountRunner?.destroy();
      connMgr.prglConnections[id]?.tableConfigRunner?.destroy();
      if (opts?.dropDatabase) {
        if (!con?.db_name) throw "Unexpected: Database name missing";
        const { db: cdb, destroy: destroyCdb } = await getCDB(
          con.id,
          undefined,
          true,
        );
        const anotherDatabaseNames: { datname: string }[] = await cdb.any(`
              SELECT * 
              FROM pg_catalog.pg_database 
              WHERE datname <> current_database() 
              AND NOT datistemplate
              ORDER BY datname = 'postgres' DESC
            `);
        const _superUsers: { usename: string }[] = await cdb.any(
          `
              SELECT usename 
              FROM pg_user WHERE usesuper = true
              `,
          {},
        );
        const superUsers = _superUsers.map((u) => u.usename);
        await destroyCdb();
        const [anotherDatabaseName] = anotherDatabaseNames;
        if (!anotherDatabaseName) throw "Could not find another database";
        if (anotherDatabaseName.datname === con.db_name) {
          throw "Not expected: Another database is the same as the one being deleted";
        }

        let superUser: { user: string; password: string } | undefined;
        if (!superUsers.includes(con.db_user)) {
          const conWithSuperUsers = await t.connections.findOne({
            db_user: { $in: superUsers },
            db_host: con.db_host,
            db_port: con.db_port,
            db_pass: { "<>": null },
          });
          if (conWithSuperUsers) {
            superUser = {
              user: conWithSuperUsers.db_user,
              password: conWithSuperUsers.db_pass!,
            };
          }
        }
        const { db: acdb } = await getCDB(
          con.id,
          { database: anotherDatabaseName.datname, ...superUser },
          true,
        );
        await connMgr.disconnect(con.id);
        const killDbConnections = () => {
          return acdb.manyOrNone(
            `
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = \${db_name}
                AND pid <> pg_backend_pid();
              `,
            con,
          );
        };
        await killDbConnections();
        await killDbConnections();
        await acdb.any(
          `
              DROP DATABASE \${db_name:name};
            `,
          con,
        );
      }
      const conFilter = { connection_id: id };
      await t.workspaces.delete(conFilter);

      if (opts?.keepBackups) {
        await t.backups.update(conFilter, { connection_id: null });
      } else {
        const bkps = await t.backups.find(conFilter);
        for (const b of bkps) {
          await bkpManager.bkpDelete(b.id, true);
        }
        await t.backups.delete(conFilter);
      }

      const result = await t.connections.delete({ id }, { returning: "*" });

      /** delete orphaned database_configs */
      await t.database_configs.delete({
        $notExistsJoined: { connections: {} },
      });
      return result;
    });
  } catch (err) {
    return Promise.reject(err);
  }
};
