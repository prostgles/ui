
import * as fs from "fs";
import { DBSConnectionInfo, ROOT_DIR } from "./index";


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

// let isElectron = false;// process.env.PRGL_IS_ELECTRON;
// let safeStorage: SafeStorage | undefined;

let isElectron = true;
let safeStorage: Pick<SafeStorage, "decryptString" | "encryptString" > = {
  encryptString: v => Buffer.from(v),
  decryptString: v => v.toString()
};

export const getElectronConfig = () => {
  if(!isElectron) return undefined;

  if(!safeStorage || ![safeStorage.encryptString, safeStorage.decryptString].every(v => typeof v === "function")){
    throw "Invalid safeStorage provided. encryptString or decryptString is not a function"
  } 
  
  const electronConfigPath = `${ROOT_DIR}/.electron-auth.json`;
  
  return {
    getCredentials: (): DBSConnectionInfo | undefined => {

      try {
        const file = !fs.existsSync(electronConfigPath)? undefined : fs.readFileSync(electronConfigPath);//, { encoding: "utf-8" });
        if(file){
          return JSON.parse(safeStorage!.decryptString(file));
        }
      } catch(e){
        console.error(e);
      }

      return undefined;
    },
    setCredentials: (connection: DBSConnectionInfo) => {
      fs.writeFileSync(electronConfigPath, safeStorage!.encryptString(JSON.stringify(connection)));
    }
  }
}

export const start = (sStorage: SafeStorage) => {
  isElectron = true;
  safeStorage = sStorage;
  require("./index");
}