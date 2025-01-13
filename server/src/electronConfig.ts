import * as fs from "fs";
import * as path from "path";
import type { DBGeneratedSchema } from "../../commonTypes/DBGeneratedSchema";
import type { DBS } from ".";

export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;
export type DBSConnectionInfo = Pick<
  Required<Connections>,
  | "type"
  | "db_conn"
  | "db_name"
  | "db_user"
  | "db_pass"
  | "db_host"
  | "db_port"
  | "db_ssl"
  | "type"
>;
export type OnServerReadyCallback = (portNumber: number, dbs: DBS) => void;

interface SafeStorage extends NodeJS.EventEmitter {
  decryptString(encrypted: Buffer): string;
  encryptString(plainText: string): Buffer;
  isEncryptionAvailable(): boolean;
}

let isElectron = false;
let safeStorage: SafeStorage | undefined;
let port: number | undefined;

let sidConfig = {
  electronSid: "",
  onSidWasSet: () => {},
};

export const actualRootDir = path.join(__dirname, "/../../..");
let rootDir = actualRootDir;
export const getRootDir = () => rootDir;

export const getElectronConfig = () => {
  if (!isElectron) return undefined;

  if (
    !safeStorage ||
    ![safeStorage.encryptString, safeStorage.decryptString].every(
      (v) => typeof v === "function",
    )
  ) {
    throw "Invalid safeStorage provided. encryptString or decryptString is not a function";
  }

  const electronConfigPath = path.resolve(
    `${getRootDir()}/.electron-auth.json`,
  );
  const getCredentials = (): DBSConnectionInfo | undefined => {
    try {
      const file =
        !fs.existsSync(electronConfigPath) ?
          undefined
        : fs.readFileSync(electronConfigPath);
      const decrypted = file ? safeStorage!.decryptString(file) : undefined;
      if (decrypted) {
        return JSON.parse(decrypted);
      }
    } catch (e) {
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
            safeStorage!.encryptString(JSON.stringify(connection)),
          );
        } catch (err) {
          console.error("Failed writing auth file: " + electronConfigPath, err);
          throw err;
        }
      }
    },
  };
};

export const start = async (
  sStorage: SafeStorage,
  args: {
    port: number;
    electronSid: string;
    onSidWasSet: () => void;
    rootDir: string;
  },
  onReady: OnServerReadyCallback,
) => {
  isElectron = true;
  port = args.port;
  if (!Number.isInteger(args.port)) {
    throw `Must provide a valid port`;
  }
  if (!args.rootDir || typeof args.rootDir !== "string") {
    throw `Must provide a valid rootDir`;
  }
  if (
    !args.electronSid ||
    typeof args.electronSid !== "string" ||
    typeof args.onSidWasSet !== "function"
  ) {
    throw "Must provide a valid electronSid: string and onSidWasSet: ()=>void";
  }
  rootDir = args.rootDir;
  sidConfig = {
    electronSid: args.electronSid,
    onSidWasSet: args.onSidWasSet,
  };
  safeStorage = sStorage;
  const { onServerReady } = await import("./index");
  onServerReady((port, dbs) => {
    const [token] = prostglesTokens;
    if (token) {
      console.log("Setting prostgles tokens");
      dbs.global_settings.update(
        {},
        { prostgles_registration: { email: "", enabled: true, token } },
      );
    }
    return onReady(port, dbs);
  });
};

/**
 * Prostgles token granted after registration
 */
const prostglesTokens: string[] = [];
export const setProstglesToken = async (token: string) => {
  prostglesTokens.push(token);
  setInterval(() => {
    console.log("Prostgles token: " + token);
  }, 1000);
};
