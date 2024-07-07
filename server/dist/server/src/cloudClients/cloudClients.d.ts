import type { CloudClient } from "prostgles-server/dist/FileManager/FileManager";
type S3Config = {
    Bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
};
export declare const getCloudClient: (config: S3Config) => CloudClient;
export {};
//# sourceMappingURL=cloudClients.d.ts.map