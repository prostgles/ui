import type { DBS, Users } from "./index";
import type { Express, Request } from "express";
import type { SubscriptionHandler } from "prostgles-types";
import type { DBSSchema } from "../../commonTypes/publishUtils";
import type { PRGLIOSocket } from "prostgles-server/dist/DboBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import type { Auth, AuthResult, SessionUser } from "prostgles-server/dist/AuthHandler";
import type { SUser } from "./authConfig/authConfig";
export type WithOrigin = {
    origin?: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string) => void) => void;
};
type OnUse = Required<Auth<DBSchemaGenerated, SUser>>["expressConfig"]["use"];
export declare class ConnectionChecker {
    app: Express;
    constructor(app: Express);
    onSocketConnected: ({ sid, getUser }: {
        sid?: string;
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
    _db?: DB;
    config: {
        loaded: boolean;
        global_setting?: DBSSchema["global_settings"];
    };
    usersSub?: SubscriptionHandler;
    configSub?: SubscriptionHandler;
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
    created?: string | null | undefined;
    has_2fa_enabled?: boolean | null | undefined;
    id?: string | undefined;
    last_updated?: string | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
        theme?: "dark" | "light" | "from-system" | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}> | undefined>;
export declare const insertUser: (db: DBS, _db: DB, u: (import("prostgles-types/dist/insertUpdateUtils").UpsertDataToPGCast<{
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: string | null | undefined;
    has_2fa_enabled?: boolean | null | undefined;
    id?: string | undefined;
    last_updated?: string | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
        theme?: "dark" | "light" | "from-system" | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}> | import("prostgles-types/dist/insertUpdateUtils").UpsertDataToPGCast<{
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: string | null | undefined;
    has_2fa_enabled?: boolean | null | undefined;
    id?: string | undefined;
    last_updated?: string | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
        theme?: "dark" | "light" | "from-system" | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}>[]) & {
    password: string;
}) => Promise<Required<{
    "2fa"?: {
        secret: string;
        recoveryCode: string;
        enabled: boolean;
    } | null | undefined;
    created?: string | null | undefined;
    has_2fa_enabled?: boolean | null | undefined;
    id?: string | undefined;
    last_updated?: string | null | undefined;
    options?: {
        showStateDB?: boolean | undefined;
        hideNonSSLWarning?: boolean | undefined;
        viewedSQLTips?: boolean | undefined;
        viewedAccessInfo?: boolean | undefined;
        theme?: "dark" | "light" | "from-system" | undefined;
    } | null | undefined;
    password?: string | undefined;
    passwordless_admin?: boolean | null | undefined;
    status?: string | undefined;
    type?: string | undefined;
    username: string;
}> | undefined>;
export declare const DAY: number;
export {};
//# sourceMappingURL=ConnectionChecker.d.ts.map