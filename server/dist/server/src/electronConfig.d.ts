/// <reference types="node" />
/// <reference types="node" />
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export declare const ROOT_DIR: string;
export declare type Connections = Required<DBSchemaGenerated["connections"]["columns"]>;
export declare type DBSConnectionInfo = Pick<Required<Connections>, "type" | "db_conn" | "db_name" | "db_user" | "db_pass" | "db_host" | "db_port" | "db_ssl" | "type">;
export declare type OnServerReadyCallback = (portNumber: number) => void;
interface SafeStorage extends NodeJS.EventEmitter {
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
export declare const getElectronConfig: () => {
    isElectron: boolean;
    port: number | undefined;
    hasCredentials: () => boolean;
    getCredentials: () => DBSConnectionInfo | undefined;
    setCredentials: (connection: DBSConnectionInfo) => void;
} | undefined;
export declare const start: (sStorage: SafeStorage, _port: number, onReady: OnServerReadyCallback) => Promise<void>;
export {};
//# sourceMappingURL=electronConfig.d.ts.map