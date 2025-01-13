import type { ChildProcess } from "child_process";
import {
  omitKeys,
  pickKeys,
} from "prostgles-server/dist/PubSubManager/PubSubManager";
import type { DumpOpts, PGDumpParams } from "../../../commonTypes/utils";
import { getSSLEnvVars } from "../ConnectionManager/saveCertificates";
import type BackupManager from "./BackupManager";
import { envToStr, pipeFromCommand } from "./pipeFromCommand";
import {
  addOptions,
  getConnectionEnvVars,
  getConnectionUri,
  getFileMgr,
  makeLogs,
} from "./utils";

export async function pgDump(
  this: BackupManager,
  conId: string,
  credId: number | null,
  {
    options: o,
    destination,
    credentialID,
    initiator = "manual_backup",
  }: PGDumpParams,
) {
  const con = await this.dbs.connections.findOne({ id: conId });
  if (!con) throw new Error("Could not find the connection");
  let proc: ChildProcess | undefined;

  const setError = (err: any) => {
    console.error(new Date() + " pg_dump err for connection " + conId, err);
    proc?.kill();
    if (backup_id) {
      this.dbs.backups.update(
        { id: backup_id },
        { status: { err }, last_updated: new Date() },
      );
    } else {
      throw err;
    }
  };

  const { fileMgr } = await getFileMgr(this.dbs, credId);

  if (!credId) {
    const space = await this.checkIfEnoughSpace(conId);
    if (space.err) throw space.err;
  }

  const currentBackup = await this.getCurrentBackup(con.id);
  if (currentBackup) {
    throw "Cannot backup while another backup is in progress";
  }

  const SSL_ENV_VARS = getSSLEnvVars(con);

  let backup_id: string | undefined;
  const uri = getConnectionUri(con);
  const ConnectionEnvVars = getConnectionEnvVars(con);
  const ENV_VARS = { ...SSL_ENV_VARS, ...ConnectionEnvVars };
  const dumpAll = o.command === "pg_dumpall";
  const dumpCommand =
    dumpAll ?
      {
        command: this.getCmd("pg_dumpall"),
        opts: addOptions(
          ["-d", uri],
          [
            [o.clean, "--clean"],
            [o.ifExists, "--if-exists"],
            [o.globalsOnly, "--globals-only"],
            [o.rolesOnly, "--roles-only"],
            [o.dataOnly, "--data-only"],
            [o.schemaOnly, "--schema-only"],
            [!!o.encoding, ["--encoding", o.encoding!]],
            [true, "-v"],
          ],
        ),
      }
    : {
        command: this.getCmd("pg_dump"),
        // opts: addOptions([uri_NOT_SAFE_-> VISIBLE TO ps aux], [
        opts: addOptions(
          [],
          [
            [!!o.format, ["--format", o.format]],
            [o.clean, "--clean"],
            [o.create, "--create"],
            [o.noOwner, "--no-owner"],
            [o.ifExists, "--if-exists"],
            [o.dataOnly, "--data-only"],
            [!!o.encoding, ["--encoding", o.encoding!]],
            [o.schemaOnly, "--schema-only"],
            [!!o.excludeSchema, ["--exclude-schema", o.excludeSchema!]],
            [
              Number.isInteger(o.compressionLevel),
              ["--compress", o.compressionLevel!],
            ],
            [Number.isInteger(o.numberOfJobs), ["--jobs", o.numberOfJobs!]],
            [true, "-v"],
          ],
        ),
      };
  try {
    const content_type =
      dumpAll || o.format === "p" ? "text/sql" : "application/gzip";
    const backup = await this.dbs.backups.insert(
      {
        created: new Date(),
        dbSizeInBytes: await this.getDBSizeInBytes(conId),
        initiator,
        connection_id: con.id,
        credential_id: credId ?? null,
        destination: credId ? "Cloud" : "Local",
        dump_command:
          envToStr(ENV_VARS) +
          dumpCommand.command +
          " " +
          dumpCommand.opts.join(" "),
        status: { loading: { loaded: 0, total: 0 } },
        options: omitKeys(o as any, ["credentialID"]) as DumpOpts,
        content_type,
      },
      { returning: "*" },
    );

    const bkpForId = await this.dbs.backups.findOne(
      { id: backup.id },
      { select: { created: "$datetime_" } },
    );
    if (!bkpForId) throw "Internal error";
    backup_id = `${(con.db_name || "").replace(/[\W]+/g, "_")}__${bkpForId.created}_pg_dump${dumpAll ? "all" : ""}_${backup.id}.${content_type === "text/sql" ? "sql" : "dump"}`;
    await this.dbs.backups.update({ id: backup.id }, { id: backup_id });

    const getBkp = () => this.dbs.backups.findOne({ id: backup_id });

    const destStream = fileMgr.uploadStream(
      backup_id,
      content_type,
      async (loadingRaw) => {
        /** S3 is adding some extra fields while total is missing */
        const loading = pickKeys(loadingRaw, ["total", "loaded"]);
        this.dbs.backups.update(
          {
            $and: [
              { id: backup_id },
              { "status->>ok": null },
              { "status->>err": null },
            ] as any,
          },
          { status: { loading }, last_updated: new Date() },
        );
      },
      setError,
      async (item) => {
        const bkp = await getBkp();
        if (bkp && "err" in bkp.status) {
          try {
            await fileMgr.deleteFile(bkp.id);
          } catch (err) {}
        } else {
          this.dbs.backups.update(
            { id: backup_id },
            {
              sizeInBytes: item.content_length,
              uploaded: new Date(),
              status: { ok: "1" },
              last_updated: new Date(),
              local_filepath: item.filePath,
            },
          );
        }
      },
    );

    // const res = child.spawnSync(dumpCommand.command, dumpCommand.opts.concat(["-f", "-l"]) as any, { env: ENV_VARS });

    /** Will not show pg_dump TOC list progress because generating a TOC list takes as long as the actual pg_dump in some cases */
    proc = pipeFromCommand({
      ...dumpCommand,
      envVars: ENV_VARS,
      destination: destStream,
      onEnd: (err) => {
        if (err) {
          setError(err);
        }
      },
      onStdout:
        !o.keepLogs ? undefined : (
          async ({ chunk: _dump_logs, pipedLength }, isStdErr) => {
            if (!isStdErr) return;
            const currBkp = await this.dbs.backups.findOne({ id: backup_id });
            if (!currBkp || "err" in currBkp.status) {
              proc?.kill();
              return;
            }
            const dump_logs = makeLogs(
              _dump_logs,
              currBkp.dump_logs,
              currBkp.created as any,
            );
            this.dbs.backups.update(
              { id: backup_id, "status->>ok": null } as any,
              {
                dump_logs,
                last_updated: new Date(),
              },
            );
          }
        ),
      useExec: false,
    });

    const interval = setInterval(async () => {
      const bkp = await this.dbs.backups.findOne({ id: backup_id });
      if (!bkp || "err" in bkp.status) {
        destStream.end();
        clearInterval(interval);
      } else if (bkp.uploaded) {
        clearInterval(interval);
      }
    }, 2000);

    return backup_id;
  } catch (err) {
    setError(err);
  }
}
