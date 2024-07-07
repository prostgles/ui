import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { DBS } from ".";
import type { EventInfo } from "prostgles-server/dist/Logging";
export declare const loggerTableConfig: TableConfig<{
    en: 1;
}>;
export declare const setLoggerDBS: (_dbs: DBS) => void;
export declare const addLog: (e: EventInfo, connection_id: string | null) => void;
//# sourceMappingURL=Logger.d.ts.map