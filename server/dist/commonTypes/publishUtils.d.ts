import { DBSchemaGenerated } from "./DBoGenerated";
import { GroupedDetailedFilter } from "./filterUtils";
export type CustomTableRules = {
    type: "Custom";
    customTables: ({
        tableName: string;
    } & TableRules)[];
};
export type UserGroupRule = DBSSchema["access_control"]["rule"];
export type ContextValue = {
    objectName: string;
    objectPropertyName: string;
};
export type ForcedData = ({
    type: "fixed";
    fieldName: string;
    value: any;
} | {
    type: "context";
    fieldName: string;
} & ContextValue);
export type SelectRule = {
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
    dynamicFields?: {
        filterDetailed: GroupedDetailedFilter;
        fields: FieldFilter;
    }[];
};
export type InsertRule = {
    fields: FieldFilter;
    forcedDataDetail?: ForcedData[];
};
export type DeleteRule = {
    filterFields: FieldFilter;
    forcedFilterDetailed?: GroupedDetailedFilter;
};
export type DBSSchema = {
    [K in keyof DBSchemaGenerated]: Required<DBSchemaGenerated[K]["columns"]>;
};
export type TableRules = {
    select?: boolean | SelectRule;
    update?: boolean | UpdateRule;
    insert?: boolean | InsertRule;
    delete?: boolean | DeleteRule;
};
export type BasicTablePermissions = Partial<Record<keyof TableRules, boolean>>;
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
};
export declare function isObject<T extends Record<string, any>>(obj: any): obj is T;
export type FieldFilter = "" | "*" | string[] | Record<string, 1 | true> | Record<string, 0 | false>;
export declare const parseFieldFilter: (args: {
    columns: string[];
    fieldFilter: FieldFilter;
}) => string[];
export declare const parseFullFilter: (filter: GroupedDetailedFilter, context: ContextDataObject, columns: string[] | undefined) => {
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
//# sourceMappingURL=publishUtils.d.ts.map