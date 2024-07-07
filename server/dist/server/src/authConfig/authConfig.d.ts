import type { Express } from "express";
import type { AuthClientRequest, BasicSession, LoginClientInfo } from "prostgles-server/dist/AuthHandler";
import type { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import type { DB } from "prostgles-server/dist/Prostgles";
import type { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { DBS, Users } from "../index";
export declare const HOUR = 3600000;
export declare const YEAR: number;
export type Sessions = DBSSchema["sessions"];
export declare const makeSession: (user: Users | undefined, client: Pick<Sessions, "user_agent" | "ip_address" | "type"> & {
    sid?: string;
}, dbo: DBOFullyTyped<DBSchemaGenerated>, expires?: number) => Promise<BasicSession>;
export type SUser = {
    sid: string;
    user: Users;
    clientUser: {
        sid: string;
        uid: string;
        state_db_id?: string;
        has_2fa: boolean;
    } & Omit<Users, "password" | "2fa">;
};
export declare const sidKeyName: "sid_token";
type AuthType = {
    type: "session-id";
    filter: {
        id: string;
    };
    client: AuthClientRequest & LoginClientInfo;
} | {
    type: "login-success";
    filter: {
        user_id: string;
    };
};
export declare const getActiveSession: (db: DBS, authType: AuthType) => Promise<Required<{
    active?: boolean | null | undefined;
    created?: string | null | undefined;
    expires: string;
    id?: string | undefined;
    id_num?: number | undefined;
    ip_address: string;
    is_connected?: boolean | null | undefined;
    is_mobile?: boolean | null | undefined;
    last_used?: string | null | undefined;
    name?: string | null | undefined;
    project_id?: string | null | undefined;
    socket_id?: string | null | undefined;
    type: string;
    user_agent?: string | null | undefined;
    user_id: string;
    user_type: string;
}> | undefined>;
export declare const getAuth: (app: Express) => {
    sidKeyName: "sid_token";
    getUser: (sid: string | undefined, db: DBOFullyTyped<DBSchemaGenerated>, _db: DB, client: AuthClientRequest & LoginClientInfo) => Promise<SUser | undefined>;
    login: ({ username, password, totp_token, totp_recovery_code }: import("prostgles-types").AnyObject | undefined, db: DBOFullyTyped<DBSchemaGenerated>, _db: DB, { ip_address, ip_address_remote, user_agent, x_real_ip }: LoginClientInfo) => Promise<BasicSession>;
    logout: (sid: string | undefined, db: DBOFullyTyped<DBSchemaGenerated>, _db: DB) => Promise<boolean>;
    cacheSession: {
        getSession: (sid: string | undefined, db: DBOFullyTyped<DBSchemaGenerated>) => Promise<any>;
    };
    expressConfig: {
        app: Express;
        use: ((args: {
            req: import("prostgles-server/dist/AuthHandler").ExpressReq;
            res: import("prostgles-server/dist/AuthHandler").ExpressRes;
            next: import("express").NextFunction;
        } & import("prostgles-server/dist/AuthHandler").AuthRequestParams<DBSchemaGenerated, SUser>) => void | Promise<void>) | undefined;
        publicRoutes: string[];
        onGetRequestOK: (req: import("prostgles-server/dist/AuthHandler").ExpressReq, res: import("prostgles-server/dist/AuthHandler").ExpressRes, { getUser, db, dbo: dbs }: import("prostgles-server/dist/AuthHandler").AuthRequestParams<DBSchemaGenerated, SUser>) => Promise<void>;
        cookieOptions: {
            secure?: undefined;
            sameSite?: undefined;
        } | {
            secure: boolean;
            sameSite: string;
        };
        magicLinks: {
            check: (id: string, dbo: DBOFullyTyped<DBSchemaGenerated>, db: DB, { ip_address, ip_address_remote, user_agent, x_real_ip }: LoginClientInfo) => Promise<BasicSession>;
        };
    };
};
export {};
//# sourceMappingURL=authConfig.d.ts.map