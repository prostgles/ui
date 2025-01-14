import { DBGeneratedSchema } from "./DBGeneratedSchema";
import { GroupedDetailedFilter } from "./filterUtils";
export type CustomTableRules = {
    type: "Custom";
    customTables: ({
        tableName: string;
    } & TableRules)[];
};
declare const OBJ_DEF_TYPES: readonly ["boolean", "string", "number", "Date", "string[]", "number[]", "Date[]", "boolean[]"];
type DataTypes = (typeof OBJ_DEF_TYPES)[number];
type ArgObjDef = {
    type: DataTypes;
    allowedValues?: readonly string[] | readonly number[] | readonly Date[];
    defaultValue?: string;
    optional?: boolean;
    label?: string;
    /**
     * These can only be used on client side
     * */
    referencesFormatColumnContext?: {
        columnFilter: AnyObject;
    };
    references?: {
        table: string;
        column: string;
        /**
         * If true then the argument will represent the entire row and
         *  the specified column will only be used to display the chosen row
         */
        isFullRow?: boolean;
        /**
         * If true and isFullRow=true then a button will be shown
         *  in the row edit card to display this action
         */
        showInRowCard?: {
            actionLabel?: string;
        };
    };
};
type _ObjDef = DataTypes | ArgObjDef;
type ObjDef = _ObjDef | {
    oneOf: readonly _ObjDef[];
} | {
    arrayOf: _ObjDef;
};
export type ArgDef = ArgObjDef & {
    name: string;
};
export type ParamDef = ObjDef;
export type UXParamDefinition = {
    param: Record<string, ArgDef>;
    paramOneOf?: undefined;
} | {
    param?: undefined;
    paramOneOf: Record<string, ArgDef>[];
};
export type MethodClientDef = {
    name: string;
    func: string;
    args: ArgDef[];
    outputTable?: string;
};
export type ContextValue = {
    objectName: string;
    objectPropertyName: string;
};
export type ForcedData = {
    type: "fixed";
    fieldName: string;
    value: any;
} | ({
    type: "context";
    fieldName: string;
} & ContextValue);
export type SelectRule = {
    subscribe?: {
        throttle?: number;
    };
    fields: FieldFilter;
    forcedFilterDetailed?: GroupedDetailedFilter;
    filterFields?: FieldFilter;
    orderByFields?: FieldFilter;
};
export type UpdateRule = {
    fields: FieldFilter;
    forcedFilterDetailed?: GroupedDetailedFilter;
    filterFields?: FieldFilter;
    forcedDataDetail?: ForcedData[];
    checkFilterDetailed?: GroupedDetailedFilter;
    dynamicFields?: {
        filterDetailed: GroupedDetailedFilter;
        fields: FieldFilter;
    }[];
    forcedDataFrom?: "InsertRule";
    checkFilterFrom?: "InsertRule";
    fieldsFrom?: "SelectRule" | "InsertRule";
    forcedFilterFrom?: "SelectRule" | "DeleteRule";
    filterFieldsFrom?: "SelectRule" | "DeleteRule";
};
export type InsertRule = {
    fields: FieldFilter;
    forcedDataDetail?: ForcedData[];
    checkFilterDetailed?: GroupedDetailedFilter;
    checkFilterFrom?: "UpdateRule";
    forcedDataFrom?: "InsertRule";
};
export type DeleteRule = {
    filterFields: FieldFilter;
    forcedFilterDetailed?: GroupedDetailedFilter;
    filterFieldsFrom?: "SelectRule" | "UpdateRule";
    forcedFilterFrom?: "SelectRule" | "UpdateRule";
};
export type DBSSchema = {
    [K in keyof DBGeneratedSchema]: Required<DBGeneratedSchema[K]["columns"]>;
};
export type SyncRule = {
    id_fields: string[];
    synced_field: string;
    allow_delete?: boolean;
    batch_size?: number;
    throttle?: number;
};
export type TableRules = {
    select?: boolean | SelectRule;
    update?: boolean | UpdateRule;
    insert?: boolean | InsertRule;
    delete?: boolean | DeleteRule;
    subscribe?: boolean | {
        throttle?: number;
    };
    sync?: SyncRule;
};
export type BasicTablePermissions = Partial<Record<Exclude<keyof TableRules, "sync">, boolean>>;
type AnyObject = Record<string, any>;
type PublishedResultUpdate = {
    fields: FieldFilter;
    dynamicFields?: {
        filter: {
            $and: AnyObject[];
        } | {
            $or: AnyObject[];
        } | AnyObject;
        fields: FieldFilter;
    }[];
    forcedFilter?: AnyObject;
    forcedData?: AnyObject;
    filterFields?: FieldFilter;
    returningFields?: FieldFilter;
};
type PublishedResult = boolean | {
    select?: boolean | {
        fields: FieldFilter;
        filterFields?: FieldFilter;
        forcedFilter?: AnyObject;
        orderByFields?: FieldFilter;
    };
    update?: boolean | PublishedResultUpdate;
    insert?: boolean | {
        fields: FieldFilter;
        forcedData?: AnyObject;
    };
    delete?: boolean | {
        filterFields: FieldFilter;
        forcedFilter?: AnyObject;
    };
    sync?: SyncRule;
    subscribe?: boolean | {
        throttle?: number;
    };
};
export declare function isObject<T extends Record<string, any>>(obj: any): obj is T;
export type FieldFilter = "" | "*" | string[] | Record<string, 1 | true> | Record<string, 0 | false>;
export declare const parseFieldFilter: (args: {
    columns: string[];
    fieldFilter: FieldFilter;
}) => string[];
export declare const parseFullFilter: (filter: GroupedDetailedFilter, context: ContextDataObject | undefined, columns: string[] | undefined) => {
    $and: AnyObject[];
} | {
    $or: AnyObject[];
} | undefined;
type ParsedFilter = {
    $and: AnyObject[];
} | {
    $or: AnyObject[];
};
type ParsedRuleFilters = {
    forcedFilter?: ParsedFilter;
    checkFilter?: ParsedFilter;
};
export declare const parseCheckForcedFilters: (rule: TableRules[keyof TableRules], context: ContextDataObject | undefined, columns: string[] | undefined) => ParsedRuleFilters | undefined;
export type ContextDataObject = {
    user: DBSSchema["users"];
};
export declare const parseTableRules: (rules: TableRules, isView: boolean | undefined, columns: string[], context: ContextDataObject) => PublishedResult | undefined;
export type TableRulesErrors = Partial<Record<keyof TableRules, any>> & {
    all?: string;
};
export declare const getTableRulesErrors: (rules: TableRules, tableColumns: string[], contextData: ContextDataObject) => Promise<TableRulesErrors>;
export declare const validateDynamicFields: (dynamicFields: UpdateRule["dynamicFields"], db: {
    find: any;
    findOne: any;
}, context: ContextDataObject, columns: string[]) => Promise<{
    error?: any;
}>;
export declare const getCIDRRangesQuery: (arg: {
    cidr: string;
    returns: ["from", "to"];
}) => string;
export {};
