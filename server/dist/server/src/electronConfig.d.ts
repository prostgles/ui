/// <reference types="node" />
/// <reference types="node" />
import { DBSConnectionInfo } from ".";
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
    getCredentials: () => DBSConnectionInfo | undefined;
    setCredentials: (connection: DBSConnectionInfo) => void;
} | undefined;
export default function start(sStorage: SafeStorage): void;
export {};
//# sourceMappingURL=electronConfig.d.ts.map