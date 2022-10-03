import { DBSchemaGenerated } from "./DBoGenerated";
import { FullDetailedFilter } from "./filterUtils";
export declare type CustomTableRules = {
    type: "Custom";
    customTables: ({
        tableName: string;
    } & TableRules)[];
};
export declare type UserGroupRule = DBSSchema["access_control"]["rule"];
export declare type ContextValue = {
    objectName: string;
    objectPropertyName: string;
};
export declare type ForcedData = ({
    type: "fixed";
    fieldName: string;
    value: any;
} | {
    type: "context";
    fieldName: string;
} & ContextValue);
export declare type SelectRule = {
    fields: FieldFilter;
    forcedFilterDetailed?: FullDetailedFilter;
    filterFields?: FieldFilter;
    orderByFields?: FieldFilter;
};
export declare type UpdateRule = {
    fields: FieldFilter;
    forcedFilterDetailed?: FullDetailedFilter;
    filterFields?: FieldFilter;
    forcedDataDetail?: ForcedData[];
    dynamicFields?: {
        filterDetailed: FullDetailedFilter;
        fields: FieldFilter;
    }[];
};
export declare type InsertRule = {
    fields: FieldFilter;
    forcedDataDetail?: ForcedData[];
};
export declare type DeleteRule = {
    filterFields: FieldFilter;
    forcedFilterDetailed?: FullDetailedFilter;
};
export declare type DBSSchema = {
    [K in keyof DBSchemaGenerated]: Required<DBSchemaGenerated[K]["columns"]>;
};
export declare type TableRules = {
    select?: boolean | SelectRule;
    update?: boolean | UpdateRule;
    insert?: boolean | InsertRule;
    delete?: boolean | DeleteRule;
};
export declare type BasicTablePermissions = Partial<Record<keyof TableRules, boolean>>;
declare type AnyObject = Record<string, any>;
declare type PublishedResultUpdate = {
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
declare type PublishedResult = boolean | {
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
};
export declare function isObject<T extends Record<string, any>>(obj: any): obj is T;
export declare type FieldFilter = "" | "*" | string[] | Record<string, 1 | true> | Record<string, 0 | false>;
export declare const parseFieldFilter: (args: {
    columns: string[];
    fieldFilter: FieldFilter;
}) => string[];
export declare const parseFullFilter: (filter: FullDetailedFilter, context: ContextDataObject, columns: string[] | undefined) => {
    $and: AnyObject[];
} | {
    $or: AnyObject[];
} | undefined;
export declare const parseForcedFilter: (rule: TableRules[keyof TableRules], context: ContextDataObject, columns: string[] | undefined) => {
    forcedFilter: {
        $and: AnyObject[];
    } | {
        $or: AnyObject[];
    };
} | undefined;
export declare type ContextDataObject = {
    user: DBSSchema["users"];
};
export declare const parseTableRules: (rules: TableRules, isView: boolean | undefined, columns: string[], context: ContextDataObject) => PublishedResult | undefined;
export declare type TableRulesErrors = Partial<Record<keyof TableRules, any>> & {
    all?: string;
};
export declare const getTableRulesErrors: (rules: TableRules, tableColumns: string[], contextData: ContextDataObject) => Promise<TableRulesErrors>;
export declare const validateDynamicFields: (dynamicFields: UpdateRule["dynamicFields"], db: {
    find: any;
    findOne: any;
}, context: ContextDataObject, columns: string[]) => Promise<{
    error?: any;
}>;
export {};
//# sourceMappingURL=publishUtils.d.ts.map