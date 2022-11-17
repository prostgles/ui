import { DBS, Users } from "./index";
import { Express, Request } from 'express';
import { SubscriptionHandler } from "prostgles-types";
import { DBSSchema } from "../../commonTypes/publishUtils";
import { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import { DB } from "prostgles-server/dist/Prostgles";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { Auth, AuthResult, SessionUser } from "prostgles-server/dist/AuthHandler";
import { SUser } from "./authConfig";
export type WithOrigin = {
    origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
};
type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"];
export declare class ConnectionChecker {
    app: Express;
    constructor(app: Express);
    onSocketConnected: ({ sid, getUser }: {
        sid?: string | undefined;
        getUser: () => Promise<AuthResult<SessionUser<Users, Users>>>;
    }) => Promise<void>;
    initialised: {
        users: boolean;
        config: boolean;
    };
    withConfig: () => Promise<unknown>;
    onUse: OnUse;
    noPasswordAdmin?: DBSSchema["users"];
    db?: DBS;
    config: {
        loaded: boolean;
        global_setting?: DBSSchema["global_settings"];
    };
    usersSub?: SubscriptionHandler<DBSSchema["users"]>;
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
export declare const PASSWORDLESS_ADMIN_USERNAME = "passwordless_admin";
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
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}> | undefined>;
export declare const insertUser: (db: DBS, _db: DB, u: {
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: Date | null | undefined;
    id?: string | undefined;
    last_updated?: number | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
} | {
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: Date | null | undefined;
    id?: string | undefined;
    last_updated?: number | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}[]) => Promise<void>;
export {};
//# sourceMappingURL=ConnectionChecker.d.ts.map