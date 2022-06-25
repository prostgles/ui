import { DBSchema } from ".";
import { ExactlyOne } from "./util";
export declare const CompareFilterKeys: readonly ["=", "$eq", "<>", ">", ">=", "<=", "$eq", "$ne", "$gt", "$gte", "$lte"];
export declare const CompareInFilterKeys: readonly ["$in", "$nin"];
export declare type CompareFilter<T = Date | number | string | boolean> = T | ExactlyOne<Record<typeof CompareFilterKeys[number], T>> | ExactlyOne<Record<typeof CompareInFilterKeys[number], T[]>> | {
    "$between": [T, T];
};
export declare const TextFilterKeys: readonly ["$ilike", "$like"];
export declare const TextFilterFTSKeys: readonly ["@@", "@>", "<@", "$contains", "$containedBy"];
export declare const TextFilter_FullTextSearchFilterKeys: readonly ["to_tsquery", "plainto_tsquery", "phraseto_tsquery", "websearch_to_tsquery"];
export declare type FullTextSearchFilter = ExactlyOne<Record<typeof TextFilter_FullTextSearchFilterKeys[number], string[]>>;
export declare type TextFilter = CompareFilter<string> | ExactlyOne<Record<typeof TextFilterKeys[number], string>> | ExactlyOne<Record<typeof TextFilterFTSKeys[number], FullTextSearchFilter>>;
export declare const ArrayFilterOperands: readonly ["@@", "@>", "<@", "$contains", "$containedBy", "&&", "$overlaps"];
export declare type ArrayFilter<T = (number | boolean | string)[]> = CompareFilter<T> | ExactlyOne<Record<typeof ArrayFilterOperands[number], T>>;
export declare type GeoBBox = {
    ST_MakeEnvelope: number[];
};
export declare type GeomFilter = {
    "&&": GeoBBox;
} | {
    "@": GeoBBox;
};
export declare const GeomFilterKeys: readonly ["~", "~=", "@", "|&>", "|>>", ">>", "=", "<<|", "<<", "&>", "&<|", "&<", "&&&", "&&"];
export declare const GeomFilter_Funcs: string[];
export declare type AllowedTSTypes = string | number | boolean | Date | any[];
export declare type AnyObject = {
    [key: string]: any;
};
export declare type FilterDataType<T = any> = T extends string ? TextFilter : T extends number ? CompareFilter<T> : T extends boolean ? CompareFilter<T> : T extends Date ? CompareFilter<T> : T extends any[] ? ArrayFilter<T> : (CompareFilter<T> | ArrayFilter<T> | TextFilter | GeomFilter);
export declare const EXISTS_KEYS: readonly ["$exists", "$notExists", "$existsJoined", "$notExistsJoined"];
export declare type EXISTS_KEY = typeof EXISTS_KEYS[number];
declare type BasicFilter<Field extends string, DataType extends any> = Partial<{
    [K in Extract<typeof CompareFilterKeys[number], string> as `${Field}.${K}`]: DataType;
}> | Partial<{
    [K in Extract<typeof CompareInFilterKeys[number], string> as `${Field}.${K}`]: DataType[];
}>;
declare type StringFilter<Field extends string, DataType extends any> = BasicFilter<Field, DataType> & (Partial<{
    [K in Extract<typeof TextFilterKeys[number], string> as `${Field}.${K}`]: DataType;
}> | Partial<{
    [K in Extract<typeof TextFilterFTSKeys[number], string> as `${Field}.${K}`]: any;
}>);
export declare type ValueOf<T> = T[keyof T];
declare type ShorthandFilter<Obj extends Record<string, any>> = ValueOf<{
    [K in keyof Obj]: Obj[K] extends string ? StringFilter<K, Required<Obj>[K]> : BasicFilter<K, Required<Obj>[K]>;
}>;
export declare type FilterForObject<T extends AnyObject = AnyObject> = {
    [K in keyof Partial<T>]: FilterDataType<T[K]>;
} | ShorthandFilter<T>;
export declare type ExistsFilter<S = void> = Partial<{
    [key in EXISTS_KEY]: S extends DBSchema ? ExactlyOne<{
        [tname in keyof S]: FullFilter<S[tname]["columns"], S>;
    }> : {
        [key: string]: FullFilter;
    };
}>;
export declare type FilterItem<T extends AnyObject = AnyObject> = FilterForObject<T>;
export declare type FullFilter<T extends AnyObject = AnyObject, S = void> = {
    $and: FullFilter<T>[];
} | {
    $or: FullFilter<T>[];
} | FilterItem<T> | ExistsFilter<S>;
export declare type FullFilterBasic<T = {
    [key: string]: any;
}> = {
    [key in keyof Partial<T & {
        [key: string]: any;
    }>]: any;
};
export {};
//# sourceMappingURL=filters.d.ts.map