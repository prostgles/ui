import { ContextDataObject, ContextValue } from "./publishUtils";
export declare const isDefined: <T>(v: void | T | undefined) => v is T;
export declare const CORE_FILTER_TYPES: readonly [{
    readonly key: "=";
    readonly label: "=";
}, {
    readonly key: "<>";
    readonly label: "!=";
}, {
    readonly key: "not null";
    readonly label: "NOT NULL";
}, {
    readonly key: "null";
    readonly label: "NULL";
}, {
    readonly key: "$in";
    readonly label: "IN";
}, {
    readonly key: "$nin";
    readonly label: "NOT IN";
}];
export declare const FTS_FILTER_TYPES: readonly [{
    readonly key: "@@.to_tsquery";
    readonly label: "to_tsquery";
}, {
    readonly key: "@@.plainto_tsquery";
    readonly label: "plainto_tsquery";
}, {
    readonly key: "@@.phraseto_tsquery";
    readonly label: "phraseto_tsquery";
}, {
    readonly key: "@@.websearch_to_tsquery";
    readonly label: "websearch_to_tsquery";
}];
export declare const TEXT_FILTER_TYPES: readonly [{
    readonly key: "$ilike";
    readonly label: "ILIKE";
}, {
    readonly key: "$like";
    readonly label: "LIKE";
}, {
    readonly key: "$term_highlight";
    readonly label: "CONTAINS";
}];
export declare const NUMERIC_FILTER_TYPES: readonly [{
    readonly key: "$between";
    readonly label: "Between";
}, {
    readonly key: ">";
    readonly label: ">";
}, {
    readonly key: ">=";
    readonly label: ">=";
}, {
    readonly key: "<";
    readonly label: "<";
}, {
    readonly key: "<=";
    readonly label: "<=";
}];
export declare const DATE_FILTER_TYPES: readonly [{
    readonly key: "$age";
    readonly label: "Age";
}, {
    readonly key: "$ageNow";
    readonly label: "Age exact";
}, {
    readonly key: "$duration";
    readonly label: "Duration";
}];
export declare type FilterType = typeof CORE_FILTER_TYPES[number]["key"] | typeof FTS_FILTER_TYPES[number]["key"] | typeof TEXT_FILTER_TYPES[number]["key"] | typeof NUMERIC_FILTER_TYPES[number]["key"] | typeof DATE_FILTER_TYPES[number]["key"];
export declare type BaseFilter = {
    minimised?: boolean;
    disabled?: boolean;
};
export declare const JOINED_FILTER_TYPES: readonly ["$existsJoined", "$notExistsJoined"];
export declare type DetailedFilterBase = BaseFilter & {
    fieldName: string;
    type?: FilterType;
    value?: any;
    contextValue?: ContextValue;
    complexFilter?: {
        argsLeftToRight: boolean;
        comparator: string;
        otherField?: string | null;
    };
};
export declare type JoinedFilter = BaseFilter & {
    type: typeof JOINED_FILTER_TYPES[number];
    path: string[];
    filter: DetailedFilterBase;
};
export declare type SimpleFilter = DetailedFilterBase | JoinedFilter;
export declare type SmartGroupFilter = SimpleFilter[];
export declare const isJoinedFilter: (f: SimpleFilter) => f is JoinedFilter;
export declare const isDetailedFilter: (f: SimpleFilter) => f is DetailedFilterBase;
export declare const getFinalFilterInfo: (fullFilter?: GroupedDetailedFilter | SimpleFilter, context?: ContextDataObject, depth?: number) => string;
export declare const getFinalFilter: (detailedFilter: SimpleFilter, context?: ContextDataObject, opts?: {
    forInfoOnly?: boolean;
    columns?: string[];
}) => {
    $filter: any[];
} | {
    [x: string]: any;
    $filter?: undefined;
} | undefined;
export declare type GroupedDetailedFilter = {
    $and: (SimpleFilter | GroupedDetailedFilter)[];
} | {
    $or: (SimpleFilter | GroupedDetailedFilter)[];
};
