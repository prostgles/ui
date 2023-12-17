import { Publish, PublishParams } from "prostgles-server/dist/PublishParser/PublishParser";
import { DBSchemaGenerated } from "../../commonTypes/DBoGenerated";
export declare const publish: (params: PublishParams<DBSchemaGenerated>, con: Omit<DBSchemaGenerated["connections"]["columns"], "user_id">) => Promise<Publish<DBSchemaGenerated>>;
//# sourceMappingURL=publish.d.ts.map