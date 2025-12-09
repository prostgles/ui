/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from "fs";
import * as path from "path";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";

export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
export type DBSConnectionInfo = Pick<
  Required<Connections>,
  | "db_conn"
  | "db_name"
  | "db_user"
  | "db_pass"
  | "db_host"
  | "db_port"
  | "db_ssl"
  | "type"
>;
export type OnServerReadyCallback = (portNumber: number) => void;

type SafeStorage = {
  decryptString(encrypted: Buffer): string;
  encryptString(plainText: string): Buffer;
  isEncryptionAvailable(): boolean;
};

let port: number | undefined;

const electronConfig: {
  isElectron: boolean;
  electronSid: string;
  safeStorage: SafeStorage | undefined;
} = {
  isElectron: false,
  electronSid: "",
  safeStorage: undefined,
  // onReady: (actualPort: number) => {},
};

export const actualRootDir = path.join(__dirname, "/../../..");
let rootDir = actualRootDir;
/**
 * server root directory
 */
export const getRootDir = () => rootDir;

export const getElectronConfig = () => {
  const { isElectron, safeStorage } = electronConfig;
  if (!isElectron) return undefined;

  if (
    !safeStorage ||
    typeof safeStorage.encryptString !== "function" ||
    typeof safeStorage.decryptString !== "function"
  ) {
    throw "Invalid safeStorage provided. encryptString or decryptString is not a function";
  }

  const electronConfigPath = path.resolve(
    `${getRootDir()}/.prostgles-desktop-config.json`,
  );
  const getCredentials = (): DBSConnectionInfo | undefined => {
    try {
      const file =
        !fs.existsSync(electronConfigPath) ?
          undefined
        : fs.readFileSync(electronConfigPath);
      const decrypted = file ? safeStorage.decryptString(file) : undefined;
      if (decrypted) {
        return JSON.parse(decrypted) as DBSConnectionInfo;
      }
    } catch (e) {
      console.error(e);
    }

    return undefined;
  };

  return {
    isElectron: true,
    port,
    sidConfig: electronConfig,
    hasCredentials: () => !!getCredentials(),
    getCredentials,
    setCredentials: (connection?: DBSConnectionInfo) => {
      if (!connection) {
        if (fs.existsSync(electronConfigPath)) {
          fs.unlinkSync(electronConfigPath);
        }
      } else {
        try {
          console.log("Writing auth file: " + electronConfigPath);
          fs.writeFileSync(
            electronConfigPath,
            safeStorage.encryptString(JSON.stringify(connection)),
          );
        } catch (err) {
          console.error("Failed writing auth file: " + electronConfigPath, err);
          throw err;
        }
      }
    },
  };
};

export const start = async (params: {
  safeStorage: SafeStorage;
  electronSid: string;
  rootDir: string;
  onReady: (actualPort: number) => void;
  port?: number;
}) => {
  const { electronSid, onReady } = params;
  if (!params.rootDir || typeof params.rootDir !== "string") {
    throw `Must provide a valid rootDir`;
  }
  rootDir = params.rootDir;
  if (
    !electronSid ||
    typeof electronSid !== "string" ||
    typeof onReady !== "function"
  ) {
    throw "Must provide a valid electronSid: string and onSidWasSet: () => void";
  }
  electronConfig.isElectron = true;
  electronConfig.electronSid = params.electronSid;
  electronConfig.safeStorage = params.safeStorage;
  const { startServer } = await import("./index");
  const startResult = await startServer(async ({ port: actualPort }) => {
    // const [token] = prostglesTokens;
    // if (token) {
    //   console.log("Setting prostgles tokens");
    //   void dbs.global_settings.update(
    //     {},
    //     { prostgles_registration: { email: "", enabled: true, token } },
    //   );
    // }
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
    return onReady(actualPort);
  });

  return {
    destroy: async () => {
      return startResult.connMgr.destroy();
    },
  };
};

/**
 * Prostgles token granted after registration
 */
const prostglesTokens: string[] = [];
export const setProstglesToken = (token: string) => {
  prostglesTokens.push(token);
  setInterval(() => {
    console.log("Prostgles token: " + token);
  }, 1000);
};
