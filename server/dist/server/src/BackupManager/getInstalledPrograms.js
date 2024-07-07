"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalledPrograms = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prostgles_types_1 = require("prostgles-types");
let installedPrograms = {
    psql: undefined,
    pg_dump: undefined,
    pg_restore: undefined,
};
const getWindowsPsqlBinPath = async (db) => {
    let filePath = "";
    const { ProgramFiles } = process.env;
    try {
        const pgPath = ProgramFiles ? `${ProgramFiles}/PostgreSQL` : "C:/Program Files/PostgreSQL";
        if (fs.existsSync(pgPath)) {
            const installedVersions = fs.readdirSync(pgPath).map(v => Number(v));
            console.log({ installedVersions });
            const latestVersion = installedVersions.sort((a, b) => b - a)[0];
            if (latestVersion) {
                filePath = path.resolve(`${pgPath}/${latestVersion}/bin/`) + "/";
                if (fs.existsSync(`${filePath}psql.exe`)) {
                    return filePath;
                }
            }
        }
    }
    catch (e) {
        console.warn(e);
    }
    if (!filePath) {
        const installLocation = (await db.oneOrNone("SHOW data_directory"))?.data_directory;
        const binDir = installLocation.endsWith("data") ? (installLocation.slice(0, -4) + "bin/") : installLocation;
        if (fs.existsSync(`${binDir}psql.exe`)) {
            return binDir;
        }
        try {
            const psqlPath = (0, child_process_1.execSync)("where psql").toString().split(require("os").EOL)[0];
            if (psqlPath) {
                filePath = path.resolve(psqlPath + "/../") + "/";
                if (fs.existsSync(`${filePath}psql.exe`)) {
                    return filePath;
                }
            }
        }
        catch (e) {
            console.warn(e);
        }
    }
    return "";
};
const getInstalledPrograms = async (db) => {
    const os = process.platform === "win32" ? "Windows" :
        process.platform === "linux" ? "Linux" :
            process.platform === "darwin" ? "Mac" :
                "";
    let filePath = "";
    try {
        if (os === "Windows") {
            filePath = await getWindowsPsqlBinPath(db);
            const ext = ".exe";
            installedPrograms = {
                psql: (0, child_process_1.execSync)(JSON.stringify(`${filePath}psql${ext}`) + ` --version`).toString(),
                pg_dump: (0, child_process_1.execSync)(JSON.stringify(`${filePath}pg_dump${ext}`) + ` --version`).toString(),
                pg_restore: (0, child_process_1.execSync)(JSON.stringify(`${filePath}pg_restore${ext}`) + ` --version`).toString(),
            };
            /** Linux/MacOS */
        }
        else {
            if (os === "Mac") {
                const brewProgramFolders = fs.readdirSync("/opt/homebrew/opt/");
                let maxVersion = 0;
                const postgresFolders = brewProgramFolders
                    .map(folder => {
                    if (folder === "postgresql") {
                        return { version: undefined };
                    }
                    else if (folder.startsWith("postgresql@")) {
                        const version = Number(folder.split("@")[1]);
                        maxVersion = Math.max(maxVersion, version);
                        return { version };
                    }
                })
                    .filter(prostgles_types_1.isDefined);
                if (postgresFolders.length) {
                    filePath = "/opt/homebrew/opt/postgresql/bin/";
                    if (maxVersion) {
                        filePath = `/opt/homebrew/opt/postgresql@${maxVersion}/bin/`;
                    }
                    installedPrograms = {
                        psql: (0, child_process_1.execSync)(`${filePath}psql --version`).toString(),
                        pg_dump: (0, child_process_1.execSync)(`${filePath}pg_dump --version`).toString(),
                        pg_restore: (0, child_process_1.execSync)(`${filePath}pg_restore --version`).toString(),
                    };
                }
            }
            else {
                installedPrograms = {
                    psql: (0, child_process_1.execSync)("which psql").toString() && (0, child_process_1.execSync)("psql --version").toString(),
                    pg_dump: (0, child_process_1.execSync)("which pg_dump").toString() && (0, child_process_1.execSync)("pg_dump --version").toString(),
                    pg_restore: (0, child_process_1.execSync)("which pg_restore").toString() && (0, child_process_1.execSync)("pg_restore --version").toString(),
                };
            }
        }
    }
    catch (e) {
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
exports.getInstalledPrograms = getInstalledPrograms;
//# sourceMappingURL=getInstalledPrograms.js.map