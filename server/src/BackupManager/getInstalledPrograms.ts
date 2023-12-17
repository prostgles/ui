import { execSync } from "child_process";
import { DB } from "prostgles-server/dist/Prostgles";
import { ProstglesInitState } from "../../../commonTypes/electronInit";
import type { AnyObject } from "prostgles-types";
import { WithUndef } from "../../../commonTypes/utils";


let installedPrograms: WithUndef<ProstglesInitState["canDumpAndRestore"]> = {
  psql: undefined,
  pg_dump: undefined,
  pg_restore: undefined,
};

const _getInstalledPrograms = (windowsOpts?: { path: string; ext: string; }) => {
  try {
    if(windowsOpts){
      installedPrograms = {
        psql: execSync(JSON.stringify(`${windowsOpts.path}psql${windowsOpts.ext}`) + ` --version`).toString(),
        pg_dump: execSync(JSON.stringify(`${windowsOpts.path}pg_dump${windowsOpts.ext}`) + ` --version`).toString(),
        pg_restore: execSync(JSON.stringify(`${windowsOpts.path}pg_restore${windowsOpts.ext}`) + ` --version`).toString(),
      };
    /** Linux */
    } else {
      installedPrograms = {
        psql: execSync("which psql").toString() && execSync("psql --version").toString(),
        pg_dump: execSync("which pg_dump").toString() && execSync("pg_dump --version").toString(),
        pg_restore: execSync("which pg_restore").toString() && execSync("pg_restore --version").toString(),
      };
    }
  } catch(e){
    console.warn(e);
    installedPrograms = undefined;
  }

  const { pg_dump, pg_restore, psql } = installedPrograms ?? {};
  if(!psql || !pg_dump || !pg_restore){
    return undefined;
  }

  return {
    psql,
    pg_dump,
    pg_restore
  } 
}

export type InstalledPrograms = ProstglesInitState["canDumpAndRestore"] & {
  windowsOpts: {
    path: string;
    ext: string;
  }; 
} | undefined;

export const getInstalledPrograms = async (db: DB): Promise<InstalledPrograms> => {
  let opts = { path: "", ext: "" }
  let installedPrograms = _getInstalledPrograms(opts);

  /** Maybe windows. Windows postgres install does not tend to add executables to PATH so will try to find and use full paths */
  if(!installedPrograms?.pg_dump){
    const installLocation = (await db.oneOrNone("SHOW data_directory"))?.data_directory as string;
    const binDir = installLocation.endsWith("data")? (installLocation.slice(0, -4) + "bin/") : installLocation;

    opts = { path: binDir, ext: ".exe" }
    installedPrograms = _getInstalledPrograms(opts);
  }
  return installedPrograms? {
    ...installedPrograms,
    windowsOpts: opts
  } : undefined;
}