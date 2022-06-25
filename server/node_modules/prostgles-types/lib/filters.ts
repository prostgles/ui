import { DBSchema } from ".";
import { ExactlyOne } from "./util";


export const CompareFilterKeys = ["=", "$eq","<>",">",">=","<=","$eq","$ne","$gt","$gte","$lte"] as const;
export const CompareInFilterKeys = ["$in", "$nin"] as const;

/**
 * Example: col_name: { $gt: 2 }
 */
 export type CompareFilter<T = Date | number | string | boolean> =
 /**
  * column value equals provided value
  */
 | T 
 | ExactlyOne<Record<typeof CompareFilterKeys[number], T>>

 | ExactlyOne<Record<typeof CompareInFilterKeys[number], T[]>>
 | { "$between": [T, T] }
;
export const TextFilterKeys = ["$ilike", "$like"] as const;

export const TextFilterFTSKeys = ["@@", "@>", "<@", "$contains", "$containedBy"] as const;

export const TextFilter_FullTextSearchFilterKeys = ["to_tsquery","plainto_tsquery","phraseto_tsquery","websearch_to_tsquery"] as const;
export type FullTextSearchFilter = 
 | ExactlyOne<Record<typeof TextFilter_FullTextSearchFilterKeys[number], string[]>>
;

export type TextFilter = 
 | CompareFilter<string>
 | ExactlyOne<Record<typeof TextFilterKeys[number], string>>

 | ExactlyOne<Record<typeof TextFilterFTSKeys[number], FullTextSearchFilter>>
;
export const ArrayFilterOperands = [...TextFilterFTSKeys, "&&", "$overlaps"] as const;
export type ArrayFilter<T = (number | boolean | string)[]> = 
 | CompareFilter<T>
 | ExactlyOne<Record<typeof ArrayFilterOperands[number], T>>
;

/* POSTGIS */

/**
* Makes bounding box from NW and SE points
* float xmin, float ymin, float xmax, float ymax, integer srid=unknown
* https://postgis.net/docs/ST_MakeEnvelope.html
*/
export type GeoBBox = { ST_MakeEnvelope: number[] }


/**
* Returns TRUE if A's 2D bounding box intersects B's 2D bounding box.
* https://postgis.net/docs/reference.html#Operators
*/
export type GeomFilter = 

 /**
  * A's 2D bounding box intersects B's 2D bounding box.
  */
 | { "&&": GeoBBox }
//  | { "&&&": GeoBBox }
//  | { "&<": GeoBBox }
//  | { "&<|": GeoBBox }
//  | { "&>": GeoBBox }
//  | { "<<": GeoBBox }
//  | { "<<|": GeoBBox }
//  | { ">>": GeoBBox }

//  | { "=": GeoBBox }

 /**
  * A's bounding box is contained by B's
  */
 | { "@": GeoBBox }
//  | { "|&>": GeoBBox }
//  | { "|>>": GeoBBox }

 /**
  * A's bounding box contains B's.
  */
//  | { "~": GeoBBox }
//  | { "~=": GeoBBox }
;
export const GeomFilterKeys = ["~","~=","@","|&>","|>>", ">>", "=", "<<|", "<<", "&>", "&<|", "&<", "&&&", "&&"] as const;
const _GeomFilter_Funcs = ["ST_MakeEnvelope", "ST_MakePolygon"]
export const GeomFilter_Funcs =  _GeomFilter_Funcs.concat(_GeomFilter_Funcs.map(v => v.toLowerCase()));

export type AllowedTSTypes = string | number | boolean | Date | any[];
// export type AnyObject = { [key: string]: AllowedTSTypes };
export type AnyObject = { [key: string]: any };

export type FilterDataType<T = any> = 
 T extends string ? TextFilter
: T extends number ? CompareFilter<T>
: T extends boolean ? CompareFilter<T>
: T extends Date ? CompareFilter<T>
: T extends any[] ? ArrayFilter<T>
: (CompareFilter<T> | ArrayFilter<T> | TextFilter | GeomFilter)
;

export const EXISTS_KEYS = ["$exists", "$notExists", "$existsJoined", "$notExistsJoined"] as const;
export type EXISTS_KEY = typeof EXISTS_KEYS[number];


/**
 * Shortened filter operands
 */
 type BasicFilter<Field extends string, DataType extends any> = Partial<{
  [K in Extract<typeof CompareFilterKeys[number], string> as `${Field}.${K}`]: DataType
}> | Partial<{
  [K in Extract<typeof CompareInFilterKeys[number], string> as `${Field}.${K}`]: DataType[]
}>;
type StringFilter<Field extends string, DataType extends any> = BasicFilter<Field, DataType> & (Partial<{
  [K in Extract<typeof TextFilterKeys[number], string> as `${Field}.${K}`]: DataType
}> | Partial<{
  [K in Extract<typeof TextFilterFTSKeys[number], string> as `${Field}.${K}`]: any
}>);
export type ValueOf<T> = T[keyof T];

type ShorthandFilter<Obj extends Record<string, any>> = ValueOf<{
  [K in keyof Obj]: Obj[K] extends string? StringFilter<K, Required<Obj>[K]> : BasicFilter<K, Required<Obj>[K]>;
}>

/* Traverses object keys to make filter */
export type FilterForObject<T extends AnyObject = AnyObject> = 
/* { col: { $func: ["value"] } } */
| {
  [K in keyof Partial<T>]: FilterDataType<T[K]>
} 
/**
 * Filters with shorthand notation
 * @example: { "name.$ilike": 'abc' }
 */
| ShorthandFilter<T>;

export type ExistsFilter<S = void> = Partial<{ 
  [key in EXISTS_KEY]: S extends DBSchema? 
    ExactlyOne<{ 
      [tname in keyof S]: FullFilter<S[tname]["columns"], S> 
    }> : 
    { [key: string]: FullFilter }
}>

/**
 * Filter that relates to a single column { col: 2 } or
 * an exists filter: { $exists: {  } }
 */
export type FilterItem<T extends AnyObject = AnyObject> = 
  | FilterForObject<T> 


/**
 * Full filter
 * @example { $or: [ { id: 1 }, { status: 'live' } ] }
 */
export type FullFilter<T extends AnyObject = AnyObject, S = void> = 
 | { $and: FullFilter<T>[] } 
 | { $or: FullFilter<T>[] } 
 | FilterItem<T> 
 | ExistsFilter<S>

 /** Not implemented yet */
//  | { $not: FilterItem<T>  }
;

type RR = {
  h?: string[];
  id?: number;
  name?: string | null;
}

const f: FilterItem<RR> = {
   "h.$eq": ["2"] 
}
const forcedFilter: FullFilter<RR> = {
// "h.$eq": ["2"]
  $and: [
    { "h.$eq": [] },
    { h: { "$containedBy": [] } }
  ]
}

/**
 * Simpler FullFilter to reduce load on compilation
 */
export type FullFilterBasic<T = { [key: string]: any }> = {
  [key in keyof Partial<T & { [key: string]: any }>]: any
}
