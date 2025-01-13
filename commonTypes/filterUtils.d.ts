import { ContextDataObject, ContextValue } from "./publishUtils";
export declare const isDefined: <T>(v: void | T | undefined) => v is T;
export declare const CORE_FILTER_TYPES: readonly [{
    readonly key: "=";
    readonly label: "=";
}, {
    readonly key: "<>";
    readonly label: "!=";
}, {
    readonly key: "$in";
    readonly label: "IN";
}, {
    readonly key: "$nin";
    readonly label: "NOT IN";
}, {
    readonly key: "not null";
    readonly label: "IS NOT NULL";
}, {
    readonly key: "null";
    readonly label: "IS NULL";
}, {
    readonly key: "$term_highlight";
    readonly label: "CONTAINS";
}];
export declare const FTS_FILTER_TYPES: readonly [{
    readonly key: "@@.to_tsquery";
    readonly label: "Search";
    readonly subLabel: "(to_tsquery) normalizes each token into a lexeme using the specified or default configuration, and discards any tokens that are stop words according to the configuration";
}, {
    readonly key: "@@.plainto_tsquery";
    readonly label: "Plain search";
    readonly subLabel: "(plainto_tsquery) The text is parsed and normalized much as for to_tsvector, then the & (AND) tsquery operator is inserted between surviving words";
}, {
    readonly key: "@@.phraseto_tsquery";
    readonly label: "Phrase search";
    readonly subLabel: "(phraseto_tsquery) phraseto_tsquery behaves much like plainto_tsquery, except that it inserts the <-> (FOLLOWED BY) operator between surviving words instead of the & (AND) operator. Also, stop words are not simply discarded, but are accounted for by inserting <N> operators rather than <-> operators. This function is useful when searching for exact lexeme sequences, since the FOLLOWED BY operators check lexeme order not just the presence of all the lexemes";
}, {
    readonly key: "@@.websearch_to_tsquery";
    readonly label: "Web search";
    readonly subLabel: "(websearch_to_tsquery) Unlike plainto_tsquery and phraseto_tsquery, it also recognizes certain operators. Moreover, this function will never raise syntax errors, which makes it possible to use raw user-supplied input for search. The following syntax is supported";
}];
export declare const TEXT_FILTER_TYPES: readonly [{
    readonly key: "$ilike";
    readonly label: "ILIKE";
    readonly subLabel: string;
}, {
    readonly key: "$like";
    readonly label: "LIKE";
    readonly subLabel: string;
}, {
    readonly key: "$nilike";
    readonly label: "NOT ILIKE";
}, {
    readonly key: "$nlike";
    readonly label: "NOT LIKE";
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
    readonly label: "Age at start of day";
}, {
    readonly key: "$ageNow";
    readonly label: "Age";
}, {
    readonly key: "$duration";
    readonly label: "Duration";
}];
export declare const GEO_FILTER_TYPES: readonly [{
    readonly key: "$ST_DWithin";
    readonly label: "Within";
}];
export type FilterType = (typeof CORE_FILTER_TYPES)[number]["key"] | (typeof FTS_FILTER_TYPES)[number]["key"] | (typeof TEXT_FILTER_TYPES)[number]["key"] | (typeof NUMERIC_FILTER_TYPES)[number]["key"] | (typeof DATE_FILTER_TYPES)[number]["key"] | (typeof GEO_FILTER_TYPES)[number]["key"];
export type BaseFilter = {
    minimised?: boolean;
    disabled?: boolean;
};
export declare const JOINED_FILTER_TYPES: readonly ["$existsJoined", "$notExistsJoined"];
type ComplexFilterDetailed = {
    type: "controlled";
    funcName: string | undefined;
    argsLeftToRight: boolean;
    comparator: string;
    otherField?: string | null;
} | {
    type: "$filter";
    leftExpression: Record<string, any[]>;
};
export type DetailedFilterBase = BaseFilter & {
    fieldName: string;
    type?: FilterType;
    value?: any;
    contextValue?: ContextValue;
    ftsFilterOptions?: {
        lang: string;
    };
    complexFilter?: ComplexFilterDetailed;
};
type JoinPath = {
    table: string;
    on?: Record<string, string>[] | undefined;
};
export type JoinedFilter = BaseFilter & {
    type: (typeof JOINED_FILTER_TYPES)[number];
    path: (string | JoinPath)[];
    filter: DetailedFilterBase;
};
export type SimpleFilter = DetailedFilterBase | JoinedFilter;
export type SmartGroupFilter = SimpleFilter[];
export declare const isJoinedFilter: (f: SimpleFilter) => f is JoinedFilter;
export declare const isDetailedFilter: (f: SimpleFilter) => f is DetailedFilterBase;
type InfoType = "pg";
export declare const getFinalFilterInfo: (fullFilter?: GroupedDetailedFilter | SimpleFilter, context?: ContextDataObject, depth?: number, opts?: {
    for: InfoType;
}) => string;
export declare const parseContextVal: (f: DetailedFilterBase, context: ContextDataObject | undefined, { forInfoOnly }?: GetFinalFilterOpts) => any;
type GetFinalFilterOpts = {
    forInfoOnly?: boolean | InfoType;
    columns?: string[];
};
export declare const getFinalFilter: (detailedFilter: SimpleFilter, context?: ContextDataObject, opts?: GetFinalFilterOpts) => Record<string, any> | undefined;
export type GroupedDetailedFilter = {
    $and: (SimpleFilter | GroupedDetailedFilter)[];
} | {
    $or: (SimpleFilter | GroupedDetailedFilter)[];
};
export {};
