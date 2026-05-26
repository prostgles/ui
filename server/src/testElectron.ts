import { join } from "node:path";
import { start } from "./electronConfig";

const safeStorage = {
  encryptString: (v: any) => Buffer.from(v),
  decryptString: (v: Buffer) => v.toString(),
  isEncryptionAvailable: () => true,
};

const actualRootDir = join(__dirname, "/../../..");

/** Must set this manually in cookies */
const electronSid =
  "1d1b8188-b199-435a-8c93-cf307d42cfe01d1b8188-b199-435a-8c93-cf307d42cfe0";
void start({
  safeStorage,
  electronSid,
  rootDir: actualRootDir,
  port: 3004, // For testing convenience
  onReady: (actualPort) => {
    console.log(`http://localhost:${actualPort}?electronSid=${electronSid}`);
  },
});
