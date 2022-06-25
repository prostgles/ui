import { Publish, PublishParams } from "prostgles-server/dist/PublishParser";
import { DBSchemaGenerated } from "./DBoGenerated";
export declare const publish: (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">) => Promise<Publish>;
//# sourceMappingURL=publish.d.ts.map