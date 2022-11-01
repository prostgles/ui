
import * as fs from "fs";
import * as path from "path";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export const ROOT_DIR = path.join(__dirname, "/../../.." ); 

export type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export type DBSConnectionInfo = Pick<Required<Connections>, "type" | "db_conn" | "db_name" | "db_user" | "db_pass" | "db_host" | "db_port" | "db_ssl" | "type">;
export type OnServerReadyCallback = (portNumber: number) => void;

interface SafeStorage extends NodeJS.EventEmitter {

  // Docs: https://electronjs.org/docs/api/safe-storage

  /**
   * the decrypted string. Decrypts the encrypted buffer obtained  with
   * `safeStorage.encryptString` back into a string.
   *
   * This function will throw an error if decryption fails.
   */
  decryptString(encrypted: Buffer): string;
  /**
   * An array of bytes representing the encrypted string.
   *
   * This function will throw an error if encryption fails.
   */
  encryptString(plainText: string): Buffer;
  /**
   * Whether encryption is available.
   *
   * On Linux, returns true if the app has emitted the `ready` event and the secret
   * key is available. On MacOS, returns true if Keychain is available. On Windows,
   * returns true once the app has emitted the `ready` event.
   */
  isEncryptionAvailable(): boolean;
}

let isElectron = false;// process.env.PRGL_IS_ELECTRON;
let safeStorage: SafeStorage | undefined;
let port: number | undefined;

// let isElectron = true;
// let safeStorage: Pick<SafeStorage, "decryptString" | "encryptString" > = {
//   encryptString: v => Buffer.from(v),
//   decryptString: v => v.toString()
// };

export const getElectronConfig = () => {
  if(!isElectron) return undefined;

  if(!safeStorage || ![safeStorage.encryptString, safeStorage.decryptString].every(v => typeof v === "function")){
    throw "Invalid safeStorage provided. encryptString or decryptString is not a function"
  } 

  const electronConfigPath = `${ROOT_DIR}/.electron-auth.json`;

  const getCredentials = (): DBSConnectionInfo | undefined => {

    try {
      const file = !fs.existsSync(electronConfigPath)? undefined : fs.readFileSync(electronConfigPath);//, { encoding: "utf-8" });
      if(file){
        return JSON.parse(safeStorage!.decryptString(file));
      }
    } catch(e){
      console.error(e);
    }

    return undefined;
  }
  
  return {
    isElectron: true,
    port,
    hasCredentials: () => !!getCredentials(),
    getCredentials,
    setCredentials: (connection: DBSConnectionInfo) => {
      fs.writeFileSync(electronConfigPath, safeStorage!.encryptString(JSON.stringify(connection)));
    }
  }
}

export const start = async (sStorage: SafeStorage, _port: number, onReady: OnServerReadyCallback) => {
  isElectron = true;
  port = _port;
  safeStorage = sStorage;
  const { onServerReady } = require("./index");
  onServerReady(onReady)
}