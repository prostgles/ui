import { DBHandlerServer } from "../dist/Prostgles";
import { DBHandlerClient } from "./client/index";
export declare function tryRun(desc: string, func: () => any, log?: Function): Promise<void>;
export declare function tryRunP(desc: string, func: (resolve: any, reject: any) => any, log?: Function): Promise<unknown>;
export default function isomorphic(db: Partial<DBHandlerServer> | Partial<DBHandlerClient>): Promise<void>;
//# sourceMappingURL=isomorphic_queries.d.ts.map