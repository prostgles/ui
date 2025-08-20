import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { DB } from "prostgles-server/dist/Prostgles";
import {
  programList,
  type InstalledPrograms,
} from "../../../common/electronInitTypes";
import type { WithUndef } from "../../../common/utils";
import { isDefined } from "prostgles-types";
import { EOL } from "os";

let installedPrograms: WithUndef<InstalledPrograms> | undefined = {
  psql: undefined,
  pg_dump: undefined,
  pg_restore: undefined,
  docker: undefined,
  filePath: undefined,
  os: undefined,
};

const getDataDirectory = async (db: DB) => {
  const dataDir = (
    await db.one<{ data_directory: string }>("SHOW data_directory")
  ).data_directory;
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
      const psqlPath = execSync("where psql").toString().split(EOL)[0];
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

const tryExecSync = (command: string): string | undefined => {
  try {
    return execSync(command).toString();
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
  }
};
export const getInstalledPsqlVersions = async (
  db: DB,
): Promise<InstalledPrograms | undefined> => {
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
        os,
        filePath,
        psql: tryExecSync(
          JSON.stringify(`${filePath}psql${ext}`) + ` --version`,
        ),
        pg_dump: tryExecSync(
          JSON.stringify(`${filePath}pg_dump${ext}`) + ` --version`,
        ),
        pg_restore: tryExecSync(
          JSON.stringify(`${filePath}pg_restore${ext}`) + ` --version`,
        ),
        docker: tryExecSync("docker --version"),
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
            os,
            filePath,
            psql: tryExecSync(`${filePath}psql --version`),
            pg_dump: tryExecSync(`${filePath}pg_dump --version`),
            pg_restore: tryExecSync(`${filePath}pg_restore --version`),
            docker: tryExecSync("docker --version"),
          };
        }
      } else {
        installedPrograms = {
          os,
          filePath,
          ...getLinuxInstalledPrograms(programList),
        };
      }
    }
  } catch (e: any) {
    console.warn(e);
    installedPrograms = undefined;
  }

  const { pg_dump, pg_restore, psql, docker } = installedPrograms ?? {};

  return {
    psql,
    pg_dump,
    pg_restore,
    filePath,
    docker,
    os,
  };
};

const getLinuxInstalledPrograms = <ProgramList extends readonly string[]>(
  programs: ProgramList,
): Record<ProgramList[number], string | undefined> => {
  const getInstalledVersion = (program: string) =>
    tryExecSync("which " + program) && tryExecSync(program + " --version");

  return programs.reduce(
    (acc, program) => {
      acc[program as ProgramList[number]] = getInstalledVersion(program);
      return acc;
    },
    {} as Record<ProgramList[number], string | undefined>,
  );
};
