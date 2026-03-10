import { throttle } from "@common/utils";
import { asName } from "prostgles-types";
import type { Readable } from "stream";
import { getSSLEnvVars } from "../ConnectionManager/saveCertificates";
import type BackupManager from "./BackupManager";
import type { Backups } from "./BackupManager";
import { envToStr } from "./pipeFromCommand";
import { pipeToCommand } from "./pipeToCommand";
import { addOptions, getBkp, getConnectionEnvVars, makeLogs } from "./utils";

export async function pgRestore(
  this: BackupManager,
  arg1: { bkpId: string; connId?: string },
  stream: Readable | undefined,
  o: Backups["restore_options"],
) {
  const { bkpId, connId } = arg1;
  const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);
  if (!bkp.id && !connId)
    throw new Error(
      "Must provide a connection id if backup does not have a connection_id",
    );
  const connection_id = connId ?? bkp.connection_id!;
  const con = await this.dbs.connections.findOne({ id: connection_id });
  if (!con) throw new Error("Connection not found");
  if (!o) throw new Error("Restore options missing");
  const { is_state_db } = con;
  if (is_state_db && !o.singleTransaction) {
    console.warn("Single transaction enabled for state db restore.");
    o.singleTransaction = true;
  }
  const setError = async (err: any) => {
    const currBkp = await this.dbs.backups.findOne({ id: bkpId });
    if (currBkp) {
      void this.dbs.backups.update(
        { id: bkpId },
        {
          restore_status: {
            err: (err ?? "").toString(),
          },
          last_updated: new Date(),
        },
      );
    }
  };
  if (o.newDbName) {
    if (o.create)
      throw "Cannot use 'newDbName' together with 'create'. --create option will still restore into the database specified within the dump file";
    try {
      await this.dbsSql(`CREATE DATABASE ${asName(o.newDbName)}`);
    } catch (err) {
      void setError(err);
    }
  }

  const isWin = process.platform === "win32";
  const byBassStreamDueToWindowsUnrecognisedBlockTypeError = !!(
    isWin && bkp.local_filepath
  );
  if (
    byBassStreamDueToWindowsUnrecognisedBlockTypeError &&
    !bkp.local_filepath
  ) {
    throw "Cannot restore from cloud on Windows through the Desktop version";
  }

  try {
    const SSL_ENV_VARS = getSSLEnvVars(con);
    const ConnectionEnvVars = getConnectionEnvVars(con);
    const ENV_VARS = { ...SSL_ENV_VARS, ...ConnectionEnvVars };
    const bkpStream = stream ?? (await fileMgr.getFileStream(bkp.id));
    const restoreCmd =
      o.command === "psql" || o.format === "p" ?
        {
          command: this.getCmd("psql"),
          opts: [],
        }
      : {
          command: this.getCmd("pg_restore"),
          opts: addOptions(
            [],
            [
              [true, "--dbname=" + ConnectionEnvVars.PGDATABASE], // Prevent error: "d -f/--file must be specified"
              [true, "-w"], // Do not ask for password
              [o.clean, "--clean"],
              [o.create, "--create"],
              [o.noOwner, "--no-owner"],
              [!!o.format, ["--format", o.format]],
              [o.dataOnly, "--data-only"],
              [o.ifExists, "--if-exists"],
              [o.singleTransaction, "--single-transaction"],
              [!!o.excludeSchema, ["--exclude-schema", o.excludeSchema!]],
              [Number.isInteger(o.numberOfJobs), "--jobs"],
              [true, "-v"],
              [
                byBassStreamDueToWindowsUnrecognisedBlockTypeError,
                bkp.local_filepath!,
              ],
            ],
          ),
        };
    await this.dbs.backups.update(
      { id: bkpId },
      {
        restore_logs: "",
        restore_start: new Date(),
        restore_command:
          envToStr(ENV_VARS) +
          restoreCmd.command +
          " " +
          restoreCmd.opts.join(" "),
        restore_status: { loading: { loaded: 0, total: 0 } },
        last_updated: new Date(),
      },
    );

    let chunkSum = 0;
    const throttledUpdate = throttle(async () => {
      if (!(await this.dbs.backups.findOne({ id: bkpId }))) {
        if (!is_state_db) {
          bkpStream.emit("error", "Backup file not found");
        } else {
          console.warn(`Backup with id ${bkpId} not found`);
        }
      } else {
        const finished = chunkSum >= +(bkp.sizeInBytes ?? bkp.dbSizeInBytes);
        void this.dbs.backups.update(
          { id: bkpId },
          {
            restore_status:
              finished ?
                {
                  ok: `${new Date()}`,
                }
              : {
                  loading: {
                    loaded: chunkSum,
                    total: +(bkp.sizeInBytes ?? bkp.dbSizeInBytes),
                  },
                },
            ...(finished && !(bkp.status as any)?.ok ?
              { status: { ok: `${new Date()}` } }
            : {}),
          },
        );

        if (finished) {
          const dummyViewToReloadSchema =
            "prostgles_dummy_view_to_reload_schema";
          void this.connMgr
            .getConnectionStartedInstance(con.id)
            .prgl._db.any(
              `
            CREATE VIEW ${dummyViewToReloadSchema} AS SELECT 1;
          `,
            )
            .then(() => {
              void this.connMgr.getConnectionStartedInstance(con.id).prgl._db
                .any(`
              DROP VIEW ${dummyViewToReloadSchema};
            `);
            });
        }
      }
    }, 1000);

    bkpStream.on("data", (chunk) => {
      chunkSum += chunk.length;
      if (is_state_db) {
        if (typeof chunk === "string" || Buffer.byteLength(chunk) < 1e6) {
          console.log(chunk.toString());
        }
      }
      throttledUpdate();
    });

    const proc = pipeToCommand(
      restoreCmd.command,
      restoreCmd.opts,
      ENV_VARS,
      bkpStream,
      (err) => {
        if (err) {
          console.error("pipeToCommand ERR:", err);
          if (!is_state_db) {
            bkpStream.destroy();
            void setError(err);
          }
        } else {
          void this.dbs.backups.update(
            { id: bkpId },
            {
              restore_end: new Date(),
              restore_status: { ok: `${new Date()}` },
              last_updated: new Date(),
            },
          );
        }
      },
      async ({ chunk: _restore_logs }, isStdErr) => {
        /** Full logs are always provided */
        if (!isStdErr) return;
        const currBkp = await this.dbs.backups.findOne({ id: bkpId });
        if ((currBkp as any)?.restore_status.err) {
          proc.kill();
          return;
        }
        if (!currBkp) {
          bkpStream.emit("error", "Backup file not found");
          bkpStream.destroy();
        } else {
          const restore_logs = makeLogs(
            _restore_logs,
            currBkp.restore_logs,
            currBkp.restore_start as any,
          );
          void this.dbs.backups.update(
            { id: bkpId },
            { restore_end: new Date(), restore_logs, last_updated: new Date() },
          );
        }
      },
    );
  } catch (err) {
    void setError(err);
  }
}
