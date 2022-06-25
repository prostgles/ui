import { DBSchema, TableHandler, ViewHandler } from "prostgles-types";
import { DBHandlerServer, DboBuilder } from "./DboBuilder";
import { PublishAllOrNothing, PublishTableRule, PublishViewRule } from "./PublishParser";
export declare const getDBSchema: (dboBuilder: DboBuilder) => string;
export declare type DBOFullyTyped<Schema = void> = Schema extends DBSchema ? ({
    [tov_name in keyof Schema]: Schema[tov_name]["is_view"] extends true ? ViewHandler<Schema[tov_name]["columns"]> : TableHandler<Schema[tov_name]["columns"]>;
} & Pick<DBHandlerServer, "tx" | "sql">) : DBHandlerServer;
export declare type PublishFullyTyped<Schema = void> = Schema extends DBSchema ? (PublishAllOrNothing | {
    [tov_name in keyof Partial<Schema>]: PublishAllOrNothing | (Schema[tov_name]["is_view"] extends true ? PublishViewRule<Schema[tov_name]["columns"], Schema> : PublishTableRule<Schema[tov_name]["columns"], Schema>);
}) : (PublishAllOrNothing | Record<string, PublishViewRule | PublishTableRule | PublishAllOrNothing>);
//# sourceMappingURL=DBSchemaBuilder.d.ts.map