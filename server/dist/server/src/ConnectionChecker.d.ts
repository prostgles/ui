import { DBS } from "./index";
import { Express, Request } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema } from "../../commonTypes/publishUtils";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { Auth } from "prostgles-server/dist/AuthHandler";
import { SUser } from "./authConfig";
export declare type WithOrigin = {
    origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
};
declare type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"];
export declare class ConnectionChecker {
    app: Express;
    constructor(app: Express);
    onUse: OnUse;
    noPasswordAdmin?: DBSSchema["users"];
    db?: DBS;
    config: {
        loaded: boolean;
        global_setting?: DBSSchema["global_settings"];
    };
    configSub?: SubscriptionHandler<DBSSchema["global_settings"]>;
    init: (db: DBS, _db: DB) => Promise<void>;
    /**
     * This is mainly used to ensure that when there is passwordless admin access external IPs cannot connect
     */
    checkClientIP: (args: ({
        socket: PRGLIOSocket;
    } | {
        req: Request;
    }) & {
        dbsTX?: DBS;
    }) => Promise<{
        ip: string;
        isAllowed: boolean;
    }>;
    withOrigin: WithOrigin;
}
export declare const EMPTY_USERNAME = "prostgles-admin-user";
export declare const EMPTY_PASSWORD = "";
export declare const ADMIN_ACCESS_WITHOUT_PASSWORD: (db: DBS) => Promise<Required<{
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: Date | null | undefined;
    id?: string | undefined;
    last_updated?: number | null | undefined;
    no_password?: boolean | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
    } | null | undefined;
    password?: string | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}> | undefined>;
export {};
//# sourceMappingURL=ConnectionChecker.d.ts.map