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
exports.DEMO_MODE = exports.start = exports.getElectronConfig = exports.getRootDir = exports.actualRootDir = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let isElectron = false; // process.env.PRGL_IS_ELECTRON;
let safeStorage;
let port;
let sidConfig = {
    electronSid: "",
    onSidWasSet: () => { }
};
exports.actualRootDir = path.join(__dirname, "/../../..");
let rootDir = exports.actualRootDir;
const getRootDir = () => rootDir;
exports.getRootDir = getRootDir;
const getElectronConfig = () => {
    if (!isElectron)
        return undefined;
    if (!safeStorage || ![safeStorage.encryptString, safeStorage.decryptString].every(v => typeof v === "function")) {
        throw "Invalid safeStorage provided. encryptString or decryptString is not a function";
    }
    // const electronConfigPath = path.resolve(`${getRootDir()}/../../.electron-auth.json`);
    const electronConfigPath = path.resolve(`${(0, exports.getRootDir)()}/.electron-auth.json`);
    const getCredentials = () => {
        try {
            const file = !fs.existsSync(electronConfigPath) ? undefined : fs.readFileSync(electronConfigPath); //, { encoding: "utf-8" });
            if (file) {
                return JSON.parse(safeStorage.decryptString(file));
            }
        }
        catch (e) {
            console.error(e);
        }
        return undefined;
    };
    return {
        isElectron: true,
        port,
        sidConfig,
        hasCredentials: () => !!getCredentials(),
        getCredentials,
        setCredentials: (connection) => {
            if (!connection) {
                if (fs.existsSync(electronConfigPath)) {
                    fs.unlinkSync(electronConfigPath);
                }
            }
            else {
                try {
                    console.log("Writing auth file: " + electronConfigPath);
                    fs.writeFileSync(electronConfigPath, safeStorage.encryptString(JSON.stringify(connection)));
                }
                catch (err) {
                    console.error("Failed writing auth file: " + electronConfigPath, err);
                    throw err;
                }
            }
        }
    };
};
exports.getElectronConfig = getElectronConfig;
const start = async (sStorage, args, onReady) => {
    isElectron = true;
    port = args.port;
    if (!args.rootDir || typeof args.rootDir !== "string") {
        throw `Must provide a valid rootDir`;
    }
    if (!args.electronSid || typeof args.electronSid !== "string" || typeof args.onSidWasSet !== "function") {
        throw "Must provide a valid electronSid: string and onSidWasSet: ()=>void";
    }
    rootDir = args.rootDir;
    sidConfig = {
        electronSid: args.electronSid,
        onSidWasSet: args.onSidWasSet
    };
    safeStorage = sStorage;
    const { onServerReady } = require("./index");
    onServerReady(onReady);
};
exports.start = start;
console.error("Must create DEMO_MODE user types and sample databases");
exports.DEMO_MODE = true; // !!process.env.DEMO_MODE;
//# sourceMappingURL=electronConfig.js.map