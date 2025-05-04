const start = require(__dirname + "/server/dist/server/src/electronConfig");

let safeStorage = {
  encryptString: (v) => Buffer.from(v),
  decryptString: (v) => v.toString(),
};

/** Must set this manually in cookies */
const electronSid =
  "1d1b8188-b199-435a-8c93-cf307d42cfe01d1b8188-b199-435a-8c93-cf307d42cfe0";
start.start(
  safeStorage,
  {
    port: 3004,
    electronSid,
    rootDir: __dirname + "/server/",
    onSidWasSet: () => {
      console.log("onSidWasSet");
    },
  },
  (actualPort) => {
    console.log(`http://localhost:${actualPort}?electronSid=${electronSid}`);
  },
);
