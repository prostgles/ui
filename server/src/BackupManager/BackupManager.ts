import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { PassThrough } from "stream";
import { getInstalledPsqlVersions } from "./getInstalledPrograms";
import { pgDump } from "./pgDump";
import { pgRestore } from "./pgRestore";
import { bytesToSize, getBkp, getFileMgr } from "./utils";

export type Backups = Required<DBGeneratedSchema["backups"]>["columns"];
type DumpOpts = Backups["options"];
export type DumpOptsServer = DumpOpts & { initiator: string };

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
type DBS = DBOFullyTyped<DBGeneratedSchema>;

import type { InstalledPrograms } from "@common/electronInitTypes";
import { ROUTES } from "@common/utils";
import checkDiskSpace from "check-disk-space";
import type { Request, Response } from "express";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { SQLHandler, SubscriptionHandler } from "prostgles-types";
import type { SUser } from "../authConfig/sessionUtils";
import type { ConnectionManager } from "../ConnectionManager/ConnectionManager";
import { getDataPath } from "../electronConfig";
import { checkAutomaticBackup } from "./checkAutomaticBackup";

export const HOUR = 3600 * 1000;

export default class BackupManager {
  tempStreams: Record<string, { lastChunk: number; stream: PassThrough }> = {};

  installedPrograms: InstalledPrograms | undefined;

  dbs: DBS;
  dbsSql: SQLHandler;
  automaticBackupInterval: NodeJS.Timeout;
  connMgr: ConnectionManager;
  dbConfSub?: SubscriptionHandler;

  constructor(
    dbs: DBS,
    dbsSql: SQLHandler,
    connMgr: ConnectionManager,
    installedPrograms: InstalledPrograms | undefined,
  ) {
    this.dbs = dbs;
    this.dbsSql = dbsSql;
    this.connMgr = connMgr;
    this.installedPrograms = installedPrograms;

    const checkAutomaticBackupsForEachConnection = async () => {
      const connections = await this.dbs.connections.find({
        $existsJoined: {
          database_configs: { backups_config: { "@>": { enabled: true } } },
        },
      });
      for (const con of connections) {
        await this.checkAutomaticBackup(con);
      }
    };
    this.automaticBackupInterval = setInterval(() => {
      void checkAutomaticBackupsForEachConnection();
    }, HOUR / 4);
    void (async () => {
      await this.dbConfSub?.unsubscribe();
      this.dbConfSub = await dbs.database_configs.subscribe(
        {},
        { select: { backups_config: 1 }, limit: 0 },
        checkAutomaticBackupsForEachConnection,
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

  static create = async (
    db: DB,
    dbs: DBS,
    dbsSql: SQLHandler,
    connMgr: ConnectionManager,
  ) => {
    const installedPrograms = await getInstalledPsqlVersions(db);
    return new BackupManager(dbs, dbsSql, connMgr, installedPrograms);
  };

  async destroy() {
    await this.dbConfSub?.unsubscribe();
    clearInterval(this.automaticBackupInterval);
  }

  checkIfEnoughSpace = async (conId: string) => {
    const dbSizeInBytes = await this.getDBSizeInBytes(conId);
    const diskSpace = await checkDiskSpace(getDataPath());
    const minimumLimit = 100 * 1e6; // 100 MB
    if (diskSpace.free < minimumLimit) {
      const err = `There is not enough space on server for local backups:\nTotal: ${bytesToSize(diskSpace.size)} \nRemaning: ${bytesToSize(diskSpace.free)} \nRequired: ${bytesToSize(minimumLimit)}`;
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
    const { size: result } = await db.one<{ size: number }>(
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
        status: { state: "finished", timestamp: new Date().toISOString() },
      },
      { returning: "*" },
    );

    let lastChunk = Date.now();
    let chunkSum = 0;
    stream.on("data", (chunk) => {
      chunkSum += chunk.length;
      if (Date.now() - lastChunk > 1000) {
        lastChunk = Date.now();
        void this.dbs.backups.update(
          { id: bkp.id },
          {
            restore_status: {
              state: "loading",
              total: sizeBytes,
              loaded: chunkSum,
            },
          },
        );
      }
    });

    return this.pgRestore({ bkpId: bkp.id }, stream, restore_options);
  };

  bkpDelete = async (bkpId: string, force = false) => {
    const { fileMgr, bkp } = await getBkp(this.dbs, bkpId);

    try {
      await fileMgr.delete(bkp.id);
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
      return;
    }
    const backupId = req.path.slice(ROUTES.BACKUPS.length + 1);
    if (!backupId) {
      res.sendStatus(404);
      return;
    }
    const backup = await this.dbs.backups.findOne({ id: backupId });
    if (!backup) {
      res.sendStatus(404);
      return;
    }
    const { fileMgr } = await getFileMgr(this.dbs, backup.credential_id);
    if (backup.credential_id) {
      if (fileMgr.type !== "cloud")
        throw new Error("Expected cloud file manager");
      /* Allow access to file for a period equivalent to a download rate of 50KBps */
      const presignedURL = await fileMgr.getSignedUrlForDownload(
        backup.id,
        1 * 60, // 1 minute
      );
      if (!presignedURL) {
        res.sendStatus(404);
      } else {
        res.redirect(presignedURL);
      }
    } else {
      try {
        res.type(backup.content_type);
        res.sendFile(getDataPath("BACKUPS", backup.id));
      } catch (err) {
        res.sendStatus(404);
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
      status: { "@>": { state: "loading" } },
      /* If not updated in last 5 minutes then consider it dead */
      // last_updated: { ">": new Date(Date.now() - HOUR/12)  }
      $filter: [{ $ageNow: ["last_updated"] }, "<", "2 seconds"],
    });

  checkAutomaticBackup = checkAutomaticBackup.bind(this);
}
