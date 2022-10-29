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
exports.getElectronConfig = void 0;
const fs = __importStar(require("fs"));
const _1 = require(".");
const electronConfigPath = `${_1.ROOT_DIR}/.electron-auth.json`;
// let isElectron = false;// process.env.PRGL_IS_ELECTRON;
// let safeStorage: SafeStorage | undefined;
let isElectron = true;
let safeStorage = {
    encryptString: v => Buffer.from(v),
    decryptString: v => v.toString()
};
const getElectronConfig = () => {
    if (!isElectron)
        return undefined;
    if (!safeStorage || ![safeStorage.encryptString, safeStorage.decryptString].every(v => typeof v === "function")) {
        throw "Invalid safeStorage provided. encryptString or decryptString is not a function";
    }
    return {
        getCredentials: () => {
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
        },
        setCredentials: (connection) => {
            fs.writeFileSync(electronConfigPath, safeStorage.encryptString(JSON.stringify(connection)));
        }
    };
};
exports.getElectronConfig = getElectronConfig;
function start(sStorage) {
    isElectron = true;
    safeStorage = sStorage;
    require("./index");
}
exports.default = start;
//# sourceMappingURL=electronConfig.js.map