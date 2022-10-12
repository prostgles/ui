import { DBS } from "./index";
import { Express, Request } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema } from "../../commonTypes/publishUtils";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
export declare const EMPTY_USERNAME = "prostgles-no-auth-user", EMPTY_PASSWORD = "prostgles";
export declare const ADMIN_ACCESS_WITHOUT_PASSWORD: (db: DBS) => Promise<boolean>;
export declare type WithOrigin = {
    origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
};
export declare class ConnectionChecker {
    app: Express;
    configLoaded: boolean;
    constructor(app: Express);
    hasNoPWD?: boolean;
    corsValue?: string;
    trustProxy: boolean;
    db?: DBS;
    configSub?: SubscriptionHandler<DBSSchema["global_settings"]>;
    init: (db: DBS) => Promise<void>;
    /**
     * This is mainly used to ensure that when there is passwordless admin login external IPs cannot connect
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
//# sourceMappingURL=ConnectionChecker.d.ts.map