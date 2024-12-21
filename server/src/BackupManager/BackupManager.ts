import type { DBGeneratedSchema } from "../../../commonTypes/DBGeneratedSchema";
import path from "path";
import { PassThrough } from "stream";
import { pgDump } from "./pgDump";
import { pgRestore } from "./pgRestore";
import { getBkp, getFileMgr } from "./utils";
import type { InstalledPrograms } from "./getInstalledPrograms";
import { getInstalledPrograms } from "./getInstalledPrograms";

export const BACKUP_FOLDERNAME = "prostgles_backups";
export const BKP_PREFFIX = "/" + BACKUP_FOLDERNAME;

export type Backups = Required<DBGeneratedSchema["backups"]>["columns"];
type DumpOpts = Backups["options"];
export type DumpOptsServer = DumpOpts & { initiator: string };

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
type DBS = DBOFullyTyped<DBGeneratedSchema>;

import checkDiskSpace from "check-disk-space";
import type { Request, Response } from "express";
import type { SUser } from "../authConfig/getAuth";
import { getRootDir } from "../electronConfig";
import type { ConnectionManager } from "../ConnectionManager/ConnectionManager";
import type { DB } from "prostgles-server/dist/Prostgles";
import { checkAutomaticBackup } from "./checkAutomaticBackup";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { bytesToSize } from "prostgles-server/dist/FileManager/FileManager";
import type { SubscriptionHandler } from "prostgles-types";

export const HOUR = 3600 * 1000;

export default class BackupManager {
  tempStreams: Record<string, { lastChunk: number; stream: PassThrough }> = {};

  installedPrograms: InstalledPrograms | undefined;

  dbs: DBS;
  db: DB;
  automaticBackupInterval: NodeJS.Timeout;
  connMgr: ConnectionManager;
  dbConfSub?: SubscriptionHandler;

  constructor(
    db: DB,
    dbs: DBS,
    connMgr: ConnectionManager,
    installedPrograms: InstalledPrograms,
  ) {
    this.db = db;
    this.dbs = dbs;
    this.connMgr = connMgr;
    this.installedPrograms = installedPrograms;

    const checkAutomaticBkps = async () => {
      const connections = await this.dbs.connections.find({
        $existsJoined: {
          database_configs: { "backups_config->>enabled": "true" },
        },
      } as any);
      for await (const con of connections) {
        await this.checkAutomaticBackup(con);
      }
    };
    this.automaticBackupInterval = setInterval(checkAutomaticBkps, HOUR / 4);
    (async () => {
      await this.dbConfSub?.unsubscribe();
      this.dbConfSub = await dbs.database_configs.subscribe(
        {},
        { select: "", limit: 0 },
        () => {
          checkAutomaticBkps();
        },
      );
    })();
  }

  getCmd = (cmd: "pg_dump" | "pg_restore" | "pg_dumpall" | "psql") => {
    if (!this.installedPrograms) throw new Error("No installed programs");
    const { filePath, os } = this.installedPrograms;
    if (os === "Windows") {
      if (!filePath) throw new Error("No file path");
      return `${filePath}${cmd}.exe`;
    }
    return `${filePath}${cmd}`;
  };

  static create = async (db: DB, dbs: DBS, connMgr: ConnectionManager) => {
    const installedPrograms = await getInstalledPrograms(db);
    return new BackupManager(db, dbs, connMgr, installedPrograms);
  };

  async destroy() {
    await this.dbConfSub?.unsubscribe();
    clearInterval(this.automaticBackupInterval);
  }

  checkIfEnoughSpace = async (conId: string) => {
    const dbSizeInBytes = await this.getDBSizeInBytes(conId);
    const diskSpace = await checkDiskSpace(getRootDir());
    const minLimin = 100 * 1e6;
    if (diskSpace.free < minLimin) {
      const err = `There is not enough space on server for local backups:\nTotal: ${bytesToSize(diskSpace.size)} \nRemaning: ${bytesToSize(diskSpace.free)} \nRequired: ${bytesToSize(minLimin)}`;
      return { ok: false, err, diskSpace, dbSizeInBytes };
    } else if (diskSpace.free - 1.1 * dbSizeInBytes < 0) {
      const err = `There is not enough space on server for local backups:\nTotal: ${bytesToSize(diskSpace.size)} \nRemaning: ${bytesToSize(diskSpace.free)} \nRequired: 1.1*DB size on disk (${bytesToSize(dbSizeInBytes)})`;
      return { ok: false, err, diskSpace, dbSizeInBytes };
    } else {
      return { ok: true, diskSpace, dbSizeInBytes };
    }
  };

  getDBSizeInBytes = async (conId: string) => {
    const db = await this.connMgr.getNewConnectionDb(conId, {
      allowExitOnIdle: true,
    });
    const { size: result } = await db.oneOrNone(
      "SELECT pg_database_size(current_database()) as size  ",
    );
    await db.$pool.end();
    return Number.isFinite(+result) ? result : 0;
  };

  pgDump = pgDump.bind(this);

  pgRestore = pgRestore.bind(this);

  pgRestoreStream = async (
    fileName: string,
    conId: string,
    stream: PassThrough,
    sizeBytes: number,
    restore_options: Backups["restore_options"],
  ) => {
    const con = await this.dbs.connections.findOne({ id: conId });
    if (!con) throw new Error("Could not find the connection");

    const bkp = await this.dbs.backups.insert(
      {
        created: new Date(),
        dbSizeInBytes: await this.getDBSizeInBytes(conId),
        sizeInBytes: sizeBytes.toString(),
        initiator: "manual_restore_from_file: " + fileName,
        connection_id: con.id,
        credential_id: null,
        destination: "None (temp stream)",
        dump_command: "pg_dump --format=c --clean --if-exists",
        options: {
          command: "pg_dump",
          clean: true,
          format: "c",
        },
        status: { ok: `${new Date()}` },
      },
      { returning: "*" },
    );

    let lastChunk = Date.now();
    let chunkSum = 0;
    stream.on("data", (chunk) => {
      chunkSum += chunk.length;
      if (Date.now() - lastChunk > 1000) {
        lastChunk = Date.now();
        this.dbs.backups.update(
          { id: bkp.id },
          {
            restore_status: { loading: { total: sizeBytes, loaded: chunkSum } },
          },
        );
      }
    });

    return this.pgRestore({ bkpId: bkp.id }, stream, restore_options);
  };

  bkpDelete = async (bkpId: string, force = false) => {
    const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);

    try {
      await fileMgr.deleteFile(bkp.id);
    } catch (err) {
      if (!force) throw err;
    }
    await this.dbs.backups.delete({ id: bkp.id });

    return bkp.id;
  };

  onRequestBackupFile = async (
    res: Response,
    userData: SUser | undefined,
    req: Request,
  ) => {
    if (userData?.user.type !== "admin") {
      res.sendStatus(401);
    } else {
      const bkpId = req.path.slice(BKP_PREFFIX.length + 1);
      if (!bkpId) {
        res.sendStatus(404);
      } else {
        const bkp = await this.dbs.backups.findOne({ id: bkpId });
        if (!bkp) {
          res.sendStatus(404);
        } else {
          const { fileMgr } = await getFileMgr(this.dbs, bkp.credential_id);
          if (bkp.credential_id) {
            /* Allow access to file for a period equivalent to a download rate of 50KBps */
            const presignedURL = await fileMgr.getFileCloudDownloadURL(
              bkp.id,
              +(bkp.sizeInBytes ?? 1e6) / 50,
            );
            if (!presignedURL) {
              res.sendStatus(404);
            } else {
              res.redirect(presignedURL);
            }
          } else {
            try {
              res.type(bkp.content_type);
              res.sendFile(
                path.resolve(
                  path.join(getRootDir() + BKP_PREFFIX + "/" + bkp.id),
                ),
              );
            } catch (err) {
              res.sendStatus(404);
            }
          }
        }
      }
    }
  };

  timeout?: NodeJS.Timeout;
  closeStream = (streamId: string) => {
    const s = this.tempStreams[streamId];
    if (!s) throw new Error("Stream not found");
    return s.stream;
  };
  pushToStream = (streamId: string, chunk: any, cb: (err: any) => void) => {
    const s = this.tempStreams[streamId];
    if (!s) throw new Error("Stream not found");

    if (this.timeout) clearTimeout(this.timeout);

    /** Delete stale streams */
    this.timeout = setTimeout(() => {
      Object.keys(this.tempStreams).forEach((key) => {
        const v = this.tempStreams[key];
        if (v && Date.now() - v.lastChunk > 60 * 1000) {
          v.stream.destroy();
          delete this.tempStreams[key];
        }
      });
    }, 60 * 1000);

    s.lastChunk = Date.now();
    s.stream.write(chunk, cb);
  };

  getTempFileStream = (fileName: string, userId: string) => {
    // const filePath = localFolderPath + "/temp/" + fileName;
    // const writeStream = fs.createWriteStream(filePath);
    const stream = new PassThrough();
    const streamId = `${userId}-${fileName}`;
    this.tempStreams[streamId] = {
      lastChunk: Date.now(),
      stream,
    };
    stream.on("error", (err) => {
      console.error(err);
      stream.end();
      if (this.tempStreams[streamId]) {
        delete this.tempStreams[streamId];
      }
    });
    return {
      streamId,
      stream,
    };
  };

  getCurrentBackup = (conId: string) =>
    this.dbs.backups.findOne({
      connection_id: conId,
      "status->loading.<>": null,
      /* If not updated in last 5 minutes then consider it dead */
      // last_updated: { ">": new Date(Date.now() - HOUR/12)  }
      $filter: [{ $ageNow: ["last_updated"] }, "<", "2 seconds"],
    } as any);

  checkAutomaticBackup = checkAutomaticBackup.bind(this);
}
