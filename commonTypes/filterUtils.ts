import { isDefined } from "prostgles-types";

export const CORE_FILTER_TYPES = [
  { key: "=", label: "="},
  { key: "<>", label: "!="},
  { key: "not null", label: "NOT NULL"},
  { key: "null", label: "NULL"},
  { key: "$in", label: "IN"},
  { key: "$nin", label: "NOT IN"},
] as const;

export const FTS_FILTER_TYPES = [
  { key: "@@.to_tsquery", label: "to_tsquery" },
  { key: "@@.plainto_tsquery", label: "plainto_tsquery" },
  { key: "@@.phraseto_tsquery", label: "phraseto_tsquery" },
  { key: "@@.websearch_to_tsquery", label: "websearch_to_tsquery" },
] as const;

export const TEXT_FILTER_TYPES = [
  { key: "$ilike", label: "ILIKE"},
  { key: "$like", label: "LIKE"},
  { key: "$term_highlight", label: "CONTAINS"},
  // { key: "$ilikeNOT", label: "NOT ILIKE"},
  // { key: "$likeNOT", label: "NOT LIKE"},
  // { key: "$term_highlightNOT", label: "DOES NOT CONTAIN"},
] as const;

export const NUMERIC_FILTER_TYPES = [
  { key: "$between", label: "Between"},
  { key: ">",   label: ">"},
  { key: ">=",  label: ">="},
  { key: "<",   label: "<"},
  { key: "<=",  label: "<="},
] as const;

export const DATE_FILTER_TYPES = [
  { key: "$age", label: "Age"},
  { key: "$duration", label: "Duration"},
] as const;

export type FilterType =
|  typeof CORE_FILTER_TYPES[number]["key"]
|  typeof FTS_FILTER_TYPES[number]["key"]
|  typeof TEXT_FILTER_TYPES[number]["key"]
|  typeof NUMERIC_FILTER_TYPES[number]["key"]
|  typeof DATE_FILTER_TYPES[number]["key"];

export type BaseFilter = {
  minimised?: boolean;
  disabled?: boolean;
}
export const JOINED_FILTER_TYPES = ["$existsJoined", "$notExistsJoined"] as const;
export type DetailedFilterBase = BaseFilter & {
  fieldName: string;
  type?: FilterType;
  value?: any;
  complexFilter?: {
    argsLeftToRight: boolean;
    comparator: string;
    otherField?: string | null;
  }
}

export type JoinedFilter = BaseFilter & {
  type: typeof JOINED_FILTER_TYPES[number];
  path: string[];
  filter: DetailedFilterBase;
}
export type SimpleFilter = DetailedFilterBase | JoinedFilter;
export type SmartGroupFilter = SimpleFilter[];

export const isJoinedFilter = (f: SimpleFilter): f is JoinedFilter => Boolean(f.type && JOINED_FILTER_TYPES.includes(f.type as any));
export const isDetailedFilter = (f: SimpleFilter): f is DetailedFilterBase => !isJoinedFilter(f.type as any);

export const getFinalFilter = (detailedFilter: SimpleFilter) => { 

  if("fieldName" in detailedFilter && detailedFilter.disabled || isJoinedFilter(detailedFilter) && detailedFilter.filter.disabled) return undefined;

  const getF = (f: DetailedFilterBase) => {
    let val = ({ ...f }).value;
    if(f.type === "$age" || f.type === "$duration"){
      const { comparator, argsLeftToRight = true, otherField } = f.complexFilter ?? {};
      const $age = f.type === "$age"? [f.fieldName] : [f.fieldName, otherField].filter(isDefined);
      if(!argsLeftToRight) $age.reverse();
      return {
        $filter: [
          { $age },
          comparator,
          f.value
        ]
      }
    }
    if(f.type === "not null"){
      return {
        [f.fieldName + ".<>"]: null
      }
    }
    if(f.type === "null"){
      return {
        [f.fieldName]: null
      }
    }
    return { 
      [[f.fieldName, f.type === "="? null : f.type].filter(v => v).join(".")]: val
    }
  };

  if(FTS_FILTER_TYPES.some(f => f.key === detailedFilter.type) && "fieldName" in detailedFilter){
    return {
      [`${detailedFilter.fieldName}.${detailedFilter.type}`]: [
        detailedFilter.value
      ]
    }
  } else if(isJoinedFilter(detailedFilter)){
    
    return {
      [detailedFilter.type]: {
        [`${detailedFilter.path.join(".")}`]: getF(detailedFilter.filter)
      }
    };
  } else if(detailedFilter.type === "$term_highlight"){

    return {
      $term_highlight: [[detailedFilter.fieldName || "*"], detailedFilter.value, { matchCase: false, edgeTruncate: 30, returnType: "boolean" } ]
    };
  }
  return getF(detailedFilter)
}


export type FullDetailedFilter =
| { $and: (SimpleFilter | FullDetailedFilter)[] } 
| { $or: (SimpleFilter | FullDetailedFilter)[] } 