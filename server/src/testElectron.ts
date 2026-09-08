import { join } from "node:path";
import { start } from "./electronConfig";
import { DBS_CONNECTION_INFO } from "./envVars";

const safeStorage = {
  encryptString: (v: any) => {
    throw "Not allowed in test environment";
    // return Buffer.from(v);
  },
  decryptString: (v: Buffer) => {
    return v.toString();
  },
  isEncryptionAvailable: () => true,
};

const actualRootDir = join(__dirname, "/../../..");

/** Must set this manually in cookies */
const electronSid =
  "1d1b8188-b199-435a-8c93-cf307d42cfe01d1b8188-b199-435a-8c93-cf307d42cfe0";
void start({
  safeStorage,
  electronSid,
  userDataDir: actualRootDir,
  devCredentials: DBS_CONNECTION_INFO,
  port: 3004, // For testing convenience
  onReady: (actualPort) => {
    console.log(`http://localhost:${actualPort}?electronSid=${electronSid}`);
  },
  focusWindow: () => {
    console.log("focusWindow called");
  },
});
