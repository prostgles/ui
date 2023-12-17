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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBS_CONNECTION_INFO = exports.PROSTGLES_STRICT_COOKIE = exports.POSTGRES_SSL = exports.POSTGRES_USER = exports.POSTGRES_PORT = exports.POSTGRES_PASSWORD = exports.POSTGRES_HOST = exports.POSTGRES_DB = exports.POSTGRES_URL = exports.PRGL_PASSWORD = exports.PRGL_USERNAME = void 0;
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
const electronConfig_1 = require("./electronConfig");
const tableConfig_1 = require("./tableConfig");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const envFileVars = dotenv.config({
    path: path_1.default.resolve(electronConfig_1.actualRootDir + '/../.env')
});
_a = ({
    ...(envFileVars?.parsed ?? {}),
    ...(process.env),
}), _b = _a.PRGL_USERNAME, exports.PRGL_USERNAME = _b === void 0 ? "" : _b, _c = _a.PRGL_PASSWORD, exports.PRGL_PASSWORD = _c === void 0 ? "" : _c, exports.POSTGRES_URL = _a.POSTGRES_URL, exports.POSTGRES_DB = _a.POSTGRES_DB, exports.POSTGRES_HOST = _a.POSTGRES_HOST, exports.POSTGRES_PASSWORD = _a.POSTGRES_PASSWORD, exports.POSTGRES_PORT = _a.POSTGRES_PORT, exports.POSTGRES_USER = _a.POSTGRES_USER, exports.POSTGRES_SSL = _a.POSTGRES_SSL, exports.PROSTGLES_STRICT_COOKIE = _a.PROSTGLES_STRICT_COOKIE;
const db_ssl = tableConfig_1.DB_SSL_ENUM[tableConfig_1.DB_SSL_ENUM.indexOf(exports.POSTGRES_SSL?.trim().toLowerCase())] ?? "prefer";
exports.DBS_CONNECTION_INFO = (0, validateConnection_1.validateConnection)({
    type: !exports.POSTGRES_URL ? "Standard" : "Connection URI",
    db_conn: exports.POSTGRES_URL ?? null,
    db_name: exports.POSTGRES_DB,
    db_user: exports.POSTGRES_USER,
    db_pass: exports.POSTGRES_PASSWORD ?? null,
    db_host: exports.POSTGRES_HOST,
    db_port: parseInt(exports.POSTGRES_PORT ?? "5432"),
    db_ssl,
});
//# sourceMappingURL=envVars.js.map