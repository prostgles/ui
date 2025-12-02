import path from "path";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { FileManager } from "prostgles-server/dist/FileManager/FileManager";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";

import type { Connections, DBS } from "..";
import { getAge, ROUTES } from "@common/utils";
import { getCloudClient } from "../cloudClients/cloudClients";
import { getConnectionDetails } from "../connectionUtils/getConnectionDetails";
import { getRootDir } from "../electronConfig";

export const getConnectionUri = (c: Connections) =>
  c.db_conn ||
  `postgres://${c.db_user}:${c.db_pass || ""}@${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;

export async function getFileMgr(dbs: DBS, credId: number | null) {
  const localFolderPath = path.resolve(getRootDir() + ROUTES.BACKUPS);

  let cred;
  if (credId) {
    cred = await dbs.credentials.findOne({ id: credId });
    if (!cred) throw new Error("Could not find the credentials");
  }
  const fileMgr = new FileManager(
    cred ?
      getCloudClient({
        accessKeyId: cred.key_id,
        secretAccessKey: cred.key_secret,
        Bucket: cred.bucket!,
        region: cred.region || "auto",
        endpoint: cred.endpoint_url,
      })
    : { localFolderPath },
  );
  return { fileMgr, cred };
}

export async function getBkp(
  dbs: DBOFullyTyped<DBGeneratedSchema>,
  bkpId: string,
) {
  const bkp = await dbs.backups.findOne({ id: bkpId });
  if (!bkp) throw new Error("Could not find the backup");

  const { cred, fileMgr } = await getFileMgr(dbs, bkp.credential_id);

  return {
    bkp,
    cred,
    fileMgr,
  };
}

export function bytesToSize(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)) + "");
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

type Basics = string | number | boolean;
export function addOptions(
  opts: string[],
  extra: [add: boolean | undefined, val: Basics | Basics[]][],
): string[] {
  return opts.concat(
    extra
      .filter((e) => e[0])
      .flatMap((e) => e[1])
      .map((e) => e.toString()),
  );
}

// process.stdout.on("error", (err) => {
//   debugger
// });
// process.on('uncaughtException', function (err) {
//   console.error(err);
//   console.log("Node NOT Exiting...");
// });

type ConnectionEnvVars = {
  PGHOST: string;
  PGPORT: string;
  PGDATABASE: string;
  PGUSER: string;
  PGPASSWORD: string;
};

export const getConnectionEnvVars = (c: Connections): ConnectionEnvVars => {
  const conDetails = getConnectionDetails(c);
  return {
    PGHOST: conDetails.host,
    PGPORT: conDetails.port + "",
    PGDATABASE: conDetails.database,
    PGUSER: conDetails.user,
    PGPASSWORD: conDetails.password,
  };
};

export const makeLogs = (
  newLogs: string,
  oldLogs: string | null | undefined,
  startTimeStr: string | undefined,
) => {
  let restore_logs = newLogs;
  if (startTimeStr) {
    const startTime = new Date(startTimeStr);
    const age = getAge(+startTime, Date.now(), true);
    const padd = (v: number, len = 2) =>
      v.toFixed(0).toString().padStart(len, "0");
    restore_logs = newLogs
      .split("\n")
      .filter((v) => v)
      .map((v) =>
        v.includes("T+") ? v : (
          `T+ ${[age.hours, age.minutes, age.seconds].map((v) => padd(v)).join(":") + "." + padd(age.milliseconds, 3)}   ${v}`
        ),
      )
      .join("\n");
  }
  return (oldLogs || "") + "\n" + restore_logs;
};
