import { omitKeys } from "prostgles-server/dist/PubSubManager/PubSubManager";
import { asName } from "prostgles-types";
import type { Readable } from "stream";
import { throttle } from "../../../commonTypes/utils";
import type BackupManager from "./BackupManager";
import type { Backups } from "./BackupManager";
import { envToStr } from "./pipeFromCommand";
import { pipeToCommand } from "./pipeToCommand";
import { addOptions, getBkp, getConnectionEnvVars, makeLogs } from "./utils";
import { getSSLEnvVars } from "../ConnectionManager/saveCertificates";

export async function pgRestore(
  this: BackupManager,
  arg1: { bkpId: string; connId?: string },
  stream: Readable | undefined,
  o: Backups["restore_options"],
) {
  const { bkpId, connId } = arg1;
  const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);
  if (!bkp.id && !connId)
    throw "Must provide a connection id if backup does not have a connection_id";
  const connection_id = connId ?? bkp.connection_id!;
  const con = await this.dbs.connections.findOne({ id: connection_id });
  if (!con) throw "Connection not found";
  if (!o) throw "Restore options missing";

  const setError = async (err: any) => {
    const currBkp = await this.dbs.backups.findOne({ id: bkpId });
    if (currBkp) {
      this.dbs.backups.update(
        { id: bkpId },
        {
          restore_status: {
            ...omitKeys(currBkp.restore_status as any, ["ok"]),
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
      await this.dbs.sql(`CREATE DATABASE ${asName(o.newDbName)}`);
    } catch (err) {
      setError(err);
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
          // opts: [getConnectionUri(con as any)] // NOT SAFE ps aux
          opts: [],
        }
      : {
          command: this.getCmd("pg_restore"),
          opts: addOptions(
            // ["-d", getConnectionUri(con as any) NOT SAFE FROM ps aux],
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
        bkpStream.emit("error", "Backup file not found");
      } else {
        const finished = chunkSum >= +(bkp.sizeInBytes ?? bkp.dbSizeInBytes);
        this.dbs.backups.update(
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
          this.connMgr
            .getConnection(con.id)
            .prgl._db.any(
              `
            CREATE VIEW ${dummyViewToReloadSchema} AS SELECT 1;
          `,
            )
            .then(() => {
              this.connMgr.getConnection(con.id).prgl._db.any(`
              DROP VIEW ${dummyViewToReloadSchema};
            `);
            });
        }
      }
    }, 1000);

    bkpStream.on("data", async (chunk) => {
      chunkSum += chunk.length;
      // console.log(chunk.toString(), { chunk })
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
          bkpStream.destroy();
          setError(err);
        } else {
          this.dbs.backups.update(
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
          this.dbs.backups.update(
            { id: bkpId },
            { restore_end: new Date(), restore_logs, last_updated: new Date() },
          );
        }
      },
      false,
    );
  } catch (err) {
    setError(err);
  }
}
