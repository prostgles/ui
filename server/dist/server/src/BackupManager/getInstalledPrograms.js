"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalledPrograms = void 0;
const child_process_1 = require("child_process");
let installedPrograms = {
    psql: undefined,
    pg_dump: undefined,
    pg_restore: undefined,
};
const _getInstalledPrograms = (windowsOpts) => {
    try {
        if (windowsOpts) {
            installedPrograms = {
                psql: (0, child_process_1.execSync)(JSON.stringify(`${windowsOpts.path}psql${windowsOpts.ext}`) + ` --version`).toString(),
                pg_dump: (0, child_process_1.execSync)(JSON.stringify(`${windowsOpts.path}pg_dump${windowsOpts.ext}`) + ` --version`).toString(),
                pg_restore: (0, child_process_1.execSync)(JSON.stringify(`${windowsOpts.path}pg_restore${windowsOpts.ext}`) + ` --version`).toString(),
            };
            /** Linux */
        }
        else {
            installedPrograms = {
                psql: (0, child_process_1.execSync)("which psql").toString() && (0, child_process_1.execSync)("psql --version").toString(),
                pg_dump: (0, child_process_1.execSync)("which pg_dump").toString() && (0, child_process_1.execSync)("pg_dump --version").toString(),
                pg_restore: (0, child_process_1.execSync)("which pg_restore").toString() && (0, child_process_1.execSync)("pg_restore --version").toString(),
            };
        }
    }
    catch (e) {
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
        pg_restore
    };
};
const getInstalledPrograms = async (db) => {
    let opts = { path: "", ext: "" };
    let installedPrograms = _getInstalledPrograms(opts);
    /** Maybe windows. Windows postgres install does not tend to add executables to PATH so will try to find and use full paths */
    if (!installedPrograms?.pg_dump) {
        const installLocation = (await db.oneOrNone("SHOW data_directory"))?.data_directory;
        const binDir = installLocation.endsWith("data") ? (installLocation.slice(0, -4) + "bin/") : installLocation;
        opts = { path: binDir, ext: ".exe" };
        installedPrograms = _getInstalledPrograms(opts);
    }
    return installedPrograms ? {
        ...installedPrograms,
        windowsOpts: opts
    } : undefined;
};
exports.getInstalledPrograms = getInstalledPrograms;
//# sourceMappingURL=getInstalledPrograms.js.map