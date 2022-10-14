import { Auth } from 'prostgles-server/dist/AuthHandler';
import { Users } from "./index";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
import { Express } from "express";
export declare type SUser = {
    sid: string;
    user: Users;
    clientUser: {
        sid: string;
        uid: string;
        state_db_id: string;
        has_2fa: boolean;
    } & Omit<Users, "password" | "2fa">;
};
export declare const getAuth: (app: Express) => Auth<DBSchemaGenerated, SUser>;
//# sourceMappingURL=authConfig.d.ts.map