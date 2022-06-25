import { AnyObject, TableInfo } from "prostgles-types";
import { JoinInfo } from "./DboBuilder";
import { ALLOWED_EXTENSION, ALLOWED_CONTENT_TYPE } from "./FileManager";
import { DB, DBHandlerServer, Prostgles } from "./Prostgles";
declare type ColExtraInfo = {
    min?: string | number;
    max?: string | number;
    hint?: string;
};
export declare type I18N_Config<LANG_IDS> = {
    [lang_id in keyof LANG_IDS]: string;
};
export declare const parseI18N: <LANG_IDS, Def extends string>(params: {
    config?: string | I18N_Config<LANG_IDS>;
    lang?: string | keyof LANG_IDS;
    defaultLang: string | keyof LANG_IDS;
    defaultValue: Def;
}) => string | Def;
declare type BaseTableDefinition<LANG_IDS = AnyObject> = {
    info?: {
        label?: string | I18N_Config<LANG_IDS>;
    };
    dropIfExistsCascade?: boolean;
    dropIfExists?: boolean;
};
declare type LookupTableDefinition<LANG_IDS> = {
    isLookupTable: {
        values: {
            [id_value: string]: {} | {
                [lang_id in keyof LANG_IDS]: string;
            };
        };
    };
};
declare type BaseColumn<LANG_IDS> = {
    /**
     * Will add these values to .getColumns() result
     */
    info?: ColExtraInfo;
    label?: string | Partial<{
        [lang_id in keyof LANG_IDS]: string;
    }>;
};
declare type SQLDefColumn = {
    /**
     * Raw sql statement used in creating/adding column
     */
    sqlDefinition?: string;
};
declare type TextColDef = {
    defaultValue?: string;
    nullable?: boolean;
};
declare type TextColumn = TextColDef & {
    isText: true;
    /**
     * Value will be trimmed before update/insert
     */
    trimmed?: boolean;
    /**
     * Value will be lower cased before update/insert
     */
    lowerCased?: boolean;
};
/**
 * Allows referencing media to this table.
 * Requires this table to have a primary key AND a valid fileTable config
 */
declare type MediaColumn = ({
    name: string;
    label?: string;
    files: "one" | "many";
} & ({
    /**
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
     */
    allowedContentType?: Record<Partial<("audio/*" | "video/*" | "image/*" | "text/*" | ALLOWED_CONTENT_TYPE)>, 1>;
} | {
    allowedExtensions?: Record<Partial<ALLOWED_EXTENSION>, 1>;
}));
declare type ReferencedColumn = {
    /**
     * Will create a lookup table that this column will reference
     */
    references?: TextColDef & {
        tableName: string;
        /**
         * Defaults to id
         */
        columnName?: string;
    };
};
declare type JoinDef = {
    sourceTable: string;
    targetTable: string;
    /**
     * E.g.: [sourceCol: string, targetCol: string][];
     */
    on: [string, string][];
};
/**
 * Used in specifying a join path to a table. This column name can then be used in select
 */
declare type NamedJoinColumn = {
    label?: string;
    joinDef: JoinDef[];
};
declare type ColumnConfig<LANG_IDS = {
    en: 1;
}> = NamedJoinColumn | MediaColumn | (BaseColumn<LANG_IDS> & (SQLDefColumn | ReferencedColumn | TextColumn));
declare type TableDefinition<LANG_IDS> = {
    columns?: {
        [column_name: string]: ColumnConfig<LANG_IDS>;
    };
    constraints?: {
        [constraint_name: string]: string;
    };
    /**
     * Similar to unique constraints but expressions are allowed inside definition
     */
    replaceUniqueIndexes?: boolean;
    indexes?: {
        [index_name: string]: {
            /**
             * Overrides replaceUniqueIndexes
             */
            replace?: boolean;
            /**
             * Causes the system to check for duplicate values in the table when the index is created (if data already exist) and each time data is added.
             * Attempts to insert or update data which would result in duplicate entries will generate an error.
             */
            unique?: boolean;
            /**
             * When this option is used, PostgreSQL will build the index without taking any locks that prevent
             * concurrent inserts, updates, or deletes on the table; whereas a standard index build locks out writes (but not reads) on the table until it's done.
             * There are several caveats to be aware of when using this option — see Building Indexes Concurrently.
             */
            concurrently?: boolean;
            /**
             * Table name
             */
            /**
             * Raw sql statement used excluding parentheses. e.g.: column_name
             */
            definition: string;
            /**
             * The name of the index method to be used.
             * Choices are btree, hash, gist, and gin. The default method is btree.
             */
            using?: "btree" | "hash" | "gist" | "gin";
        };
    };
};
/**
 * Helper utility to create lookup tables for TEXT columns
 */
export declare type TableConfig<LANG_IDS = {
    en: 1;
}> = {
    [table_name: string]: BaseTableDefinition<LANG_IDS> & (TableDefinition<LANG_IDS> | LookupTableDefinition<LANG_IDS>);
};
/**
 * Will be run between initSQL and fileTable
 */
export default class TableConfigurator<LANG_IDS = {
    en: 1;
}> {
    config?: TableConfig<LANG_IDS>;
    get dbo(): DBHandlerServer;
    get db(): DB;
    prostgles: Prostgles;
    constructor(prostgles: Prostgles);
    getColumnConfig: (tableName: string, colName: string) => ColumnConfig | undefined;
    getTableInfo: (params: {
        tableName: string;
        lang?: string;
    }) => TableInfo["info"] | undefined;
    getColInfo: (params: {
        col: string;
        table: string;
        lang?: string;
    }) => (ColExtraInfo & {
        label?: string;
    }) | undefined;
    checkColVal: (params: {
        col: string;
        table: string;
        value: any;
    }) => void;
    getJoinInfo: (sourceTable: string, targetTable: string) => JoinInfo | undefined;
    init(): Promise<void>;
}
export {};
//# sourceMappingURL=TableConfig.d.ts.map