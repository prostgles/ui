const start = require("./ui/server/dist/server/src/electronConfig");

let safeStorage = {
  encryptString: (v) => Buffer.from(v),
  decryptString: (v) => v.toString(),
};

start.start(safeStorage, 3099);
