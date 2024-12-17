import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { ProstglesInitState } from "../../../commonTypes/electronInit";
import type { WithUndef } from "../../../commonTypes/utils";
import { isDefined } from "prostgles-types";

let installedPrograms: WithUndef<ProstglesInitState["canDumpAndRestore"]> = {
  psql: undefined,
  pg_dump: undefined,
  pg_restore: undefined,
};

type OS = "Windows" | "Linux" | "Mac" | "";

export type InstalledPrograms =
  | (ProstglesInitState["canDumpAndRestore"] & {
      os: OS;
      filePath: string;
    })
  | undefined;

const getDataDirectory = async (db: DB) => {
  const dataDir = (await db.oneOrNone("SHOW data_directory"))
    ?.data_directory as string;
  const binDir =
    dataDir.endsWith("data") ? dataDir.slice(0, -4) + "bin/" : undefined;
  return {
    binDir,
    dataDir,
  };
};

const getWindowsPsqlBinPath = async (db: DB) => {
  let filePath = "";
  const { ProgramFiles } = process.env;
  try {
    const pgPath =
      ProgramFiles ?
        `${ProgramFiles}/PostgreSQL`
      : "C:/Program Files/PostgreSQL";
    if (fs.existsSync(pgPath)) {
      const installedVersions = fs.readdirSync(pgPath).map((v) => Number(v));
      const latestVersion = installedVersions.sort((a, b) => b - a)[0];
      if (latestVersion) {
        filePath = path.resolve(`${pgPath}/${latestVersion}/bin/`) + "/";
        if (fs.existsSync(`${filePath}psql.exe`)) {
          return filePath;
        }
      }
    }
  } catch (e: any) {
    console.warn(e);
  }

  if (!filePath) {
    const { binDir } = await getDataDirectory(db);
    if (binDir && fs.existsSync(`${binDir}psql.exe`)) {
      return binDir;
    }

    try {
      const psqlPath = execSync("where psql")
        .toString()
        .split(require("os").EOL)[0];
      if (psqlPath) {
        filePath = path.resolve(psqlPath + "/../") + "/";
        if (fs.existsSync(`${filePath}psql.exe`)) {
          return filePath;
        }
      }
    } catch (e: any) {
      console.warn(e);
    }
  }

  return "";
};

export const getInstalledPrograms = async (
  db: DB,
): Promise<InstalledPrograms> => {
  const os =
    process.platform === "win32" ? "Windows"
    : process.platform === "linux" ? "Linux"
    : process.platform === "darwin" ? "Mac"
    : "";
  let filePath = "";
  try {
    if (os === "Windows") {
      filePath = await getWindowsPsqlBinPath(db);
      const ext = ".exe";
      installedPrograms = {
        psql: execSync(
          JSON.stringify(`${filePath}psql${ext}`) + ` --version`,
        ).toString(),
        pg_dump: execSync(
          JSON.stringify(`${filePath}pg_dump${ext}`) + ` --version`,
        ).toString(),
        pg_restore: execSync(
          JSON.stringify(`${filePath}pg_restore${ext}`) + ` --version`,
        ).toString(),
      };

      /** Linux/MacOS */
    } else {
      if (os === "Mac") {
        /**
         * Option 1 - PG was installed through EDB
         * Expecting something like this:
         *    /Library/PostgreSQL/16/bin/psql
         */
        const { binDir } = await getDataDirectory(db);
        if (binDir && fs.existsSync(`${binDir}psql`)) {
          filePath = binDir;

          /**
           * Option 2 - PG was installed through Homebrew
           * Expecting something like this:
           *    /opt/homebrew/opt/postgresql/bin/psql
           * OR
           *    /opt/homebrew/opt/postgresql@13/bin/psql
           */
        } else {
          const brewProgramFolders = fs.readdirSync("/opt/homebrew/opt/");
          let maxVersion = 0;
          const postgresFolders = brewProgramFolders
            .map((folder) => {
              if (folder === "postgresql") {
                return { version: undefined };
              } else if (folder.startsWith("postgresql@")) {
                const version = Number(folder.split("@")[1]!);
                maxVersion = Math.max(maxVersion, version);
                return { version };
              }
            })
            .filter(isDefined);

          if (postgresFolders.length) {
            filePath = "/opt/homebrew/opt/postgresql/bin/";
            if (maxVersion) {
              filePath = `/opt/homebrew/opt/postgresql@${maxVersion}/bin/`;
            }
          }
        }
        if (filePath) {
          installedPrograms = {
            psql: execSync(`${filePath}psql --version`).toString(),
            pg_dump: execSync(`${filePath}pg_dump --version`).toString(),
            pg_restore: execSync(`${filePath}pg_restore --version`).toString(),
          };
        }
      } else {
        installedPrograms = {
          psql:
            execSync("which psql").toString() &&
            execSync("psql --version").toString(),
          pg_dump:
            execSync("which pg_dump").toString() &&
            execSync("pg_dump --version").toString(),
          pg_restore:
            execSync("which pg_restore").toString() &&
            execSync("pg_restore --version").toString(),
        };
      }
    }
  } catch (e: any) {
    if (e.toString) {
      console.warn(e.toString());
    }
    if (e.stdout) {
      console.warn(e.stdout.toString());
    }
    if (e.stderr) {
      console.warn(e.stderr.toString());
    }
    console.warn(e);
    installedPrograms = undefined;
  }

  const { pg_dump, pg_restore, psql } = installedPrograms ?? {};
  if (!psql || !pg_dump || !pg_restore) {
    return undefined;
  }

  return {
    psql,
    pg_dump,
    pg_restore,
    filePath,
    os,
  };
};
