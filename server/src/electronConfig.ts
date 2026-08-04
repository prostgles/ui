import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import * as fs from "fs";
import * as path from "path";

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
  focusWindow: () => void;
  devCredentials: DBSConnectionInfo | undefined;
  userDataDir: string;
} = {
  isElectron: false,
  electronSid: "",
  safeStorage: undefined,
  devCredentials: undefined,
  userDataDir: "",
  focusWindow: () => {
    throw new Error(
      "focusWindow function not set. This should only be called in electron context.",
    );
  },
};

export const actualRootDir = path.join(__dirname, "/../../..");

export const DIRECTORIES = {
  CLIENT_BUILD: path.resolve(actualRootDir + "/../client/build"),
  CLIENT_STATIC: path.resolve(actualRootDir + "/../client/static"),
  CLIENT_ICONS: path.resolve(actualRootDir + "/../client/static/icons"),
  DOCS_SCREENSHOTS: path.resolve(actualRootDir + "/../docs/screenshots"),
} as const;

let rootDir = actualRootDir;

/**
 * server root directory
 */
export const getRootDir = () => rootDir;
let userDataDir: string | undefined;

const getDataDir = () => {
  if (electronConfig.isElectron && rootDir !== userDataDir) {
    throw new Error(
      `Electron userDataDir (${electronConfig.userDataDir}) does not match rootDir (${rootDir}). This should never happen.`,
    );
  }
  return path.resolve(process.env.PROSTGLES_DATA_DIR || getRootDir());
};

export const DATA_FOLDERS = {
  BACKUPS: "prostgles_backups",
  CERTIFICATES: "prostgles_certificates",
  MCP: "prostgles_mcp",
  STORAGE: "prostgles_storage",
  CONFIGS: "prostgles_configs",
} as const;

export const getDataPath = (
  folderLabel?: keyof typeof DATA_FOLDERS,
  ...paths: string[]
) =>
  path.join(
    getDataDir(),
    ...[...(folderLabel ? [DATA_FOLDERS[folderLabel]] : []), ...paths],
  );

export const getElectronConfig = () => {
  const { isElectron, safeStorage, focusWindow, devCredentials } =
    electronConfig;
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
    if (devCredentials) {
      return devCredentials;
    }
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
    focusWindow,
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
  userDataDir: string;
  onReady: (actualPort: number) => void;
  port?: number;
  devCredentials?: DBSConnectionInfo;
  focusWindow: () => void;
}) => {
  const { electronSid, onReady } = params;
  if (!params.userDataDir || typeof params.userDataDir !== "string") {
    throw `Must provide a valid rootDir`;
  }
  rootDir = params.userDataDir;
  userDataDir = params.userDataDir;
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
  electronConfig.devCredentials = params.devCredentials;
  electronConfig.focusWindow = params.focusWindow;
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
    port = actualPort;
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
