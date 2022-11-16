import { Auth, BasicSession } from 'prostgles-server/dist/AuthHandler';
import { Users } from "./index";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { DBOFullyTyped } from "prostgles-server/dist/DBSchemaBuilder";
import { Express } from "express";
export declare const HOUR = 3600000;
export declare const YEAR: number;
export declare const makeSession: (user: Users | undefined, client: {
    ip_address: string;
    user_agent?: string;
    sid?: string;
}, dbo: DBOFullyTyped<DBSchemaGenerated>, expires?: number) => Promise<BasicSession>;
export declare type SUser = {
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
export declare const getAuth: (app: Express) => Auth<DBSchemaGenerated, SUser>;
//# sourceMappingURL=authConfig.d.ts.map