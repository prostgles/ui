"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasswordHash = void 0;
const node_crypto_1 = require("node:crypto");
const ITERATIONS = 1e5;
const KEY_LENGTH = 512;
const getPasswordHash = ({ id }, rawPassword) => {
    const salt = Buffer.from(id).toString("base64");
    const pwdHash = (0, node_crypto_1.pbkdf2Sync)(rawPassword, salt, ITERATIONS, KEY_LENGTH, "sha512").toString("hex");
    return pwdHash;
};
exports.getPasswordHash = getPasswordHash;
//# sourceMappingURL=authUtils.js.map