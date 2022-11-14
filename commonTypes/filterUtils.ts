import { ContextDataObject, ContextValue } from "./publishUtils";

export const isDefined = <T>(v: T | undefined | void): v is T => v !== undefined && v !== null;

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
  { key: "$ageNow", label: "Age exact"},
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
  contextValue?: ContextValue;
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

export const getFinalFilterInfo = (fullFilter?: GroupedDetailedFilter | SimpleFilter, context?: ContextDataObject, depth = 0): string => {
  const filterToString = (filter: SimpleFilter): string | undefined => {
    const f = getFinalFilter(filter, context, { forInfoOnly: true });
      if(!f) return undefined;
    const fieldNameAndOperator: keyof typeof f = Object.keys(f)[0] as any;
    // console.log(fieldNameAndOperator)
    if(fieldNameAndOperator === "$term_highlight" as any){
      const [fields, value , args] = f[fieldNameAndOperator] as any
      const { matchCase } = args;
      return `${fields} contain ${matchCase? "(case sensitive)" : ""} ${value}`
    }
    return `${fieldNameAndOperator} ${JSON.stringify(f[fieldNameAndOperator])}`.split(".$").join(" "); //.split(" ").map((v, i) => i? v.toUpperCase() : v).join(" ");
  }

  let result = "";
  if(fullFilter){
    const isAnd = "$and" in fullFilter
    if(isAnd || "$or" in fullFilter){
      // @ts-ignore
      const finalFilters = fullFilter[isAnd? "$and" : "$or"].map(f => getFinalFilterInfo(f, context, depth + 1)).filter(isDefined);
      const finalFilterStr = finalFilters.join(isAnd? " AND " : " OR ");
      return (finalFilters.length > 1 && depth > 1)? `( ${finalFilterStr} )` : finalFilterStr
    }

    return filterToString(fullFilter) ?? ""
  }

  return result
}

export const getFinalFilter = (detailedFilter: SimpleFilter, context?: ContextDataObject, opts?: { forInfoOnly?: boolean; columns?: string[] }) => { 
  const { forInfoOnly = false } = opts ?? {};

  const checkFieldname = (f: string, columns?: string[]) => {
    
    if(columns?.length && !columns.includes(f)){
      throw new Error(`${f} is not a valid field name. \nExpecting one of: ${columns.join(", ")}`);
    }

    return f;
  }

  if("fieldName" in detailedFilter && detailedFilter.disabled || isJoinedFilter(detailedFilter) && detailedFilter.filter.disabled) return undefined;

  const parseContextVal = (f: DetailedFilterBase): any => {
    if((context || forInfoOnly) && f.contextValue){
      if(forInfoOnly){
        return `{{${f.contextValue.objectName}.${f.contextValue.objectPropertyName}}}`
      }
      //@ts-ignore
      return context[f.contextValue.objectName]?.[f.contextValue.objectPropertyName];
    }
    return ({...f}).value;
  }

  const getFilter = (f: DetailedFilterBase, columns?: string[]) => {
    const val = parseContextVal(f);
    const fieldName = checkFieldname(f.fieldName, columns);

    if(f.type === "$age" || f.type === "$duration"){
      const { comparator, argsLeftToRight = true, otherField } = f.complexFilter ?? {};
      const $age = f.type === "$age"? [fieldName] : [fieldName, otherField].filter(isDefined);
      if(!argsLeftToRight) $age.reverse();
      return {
        $filter: [
          { $age },
          comparator,
          val
        ]
      }
    }
    if(f.type === "not null"){
      return {
        [fieldName + ".<>"]: null
      }
    }
    if(f.type === "null"){
      return {
        [fieldName]: null
      }
    }
    return { 
      [[fieldName, f.type === "="? null : f.type].filter(v => v).join(".")]: val
    }
  };

  if(FTS_FILTER_TYPES.some(f => f.key === detailedFilter.type) && "fieldName" in detailedFilter){
    const fieldName = checkFieldname(detailedFilter.fieldName, opts?.columns);
    return {
      [`${fieldName}.${detailedFilter.type}`]: [
        parseContextVal(detailedFilter)
      ]
    }
  } else if(isJoinedFilter(detailedFilter)){
    
    return {
      [detailedFilter.type]: {
        [`${detailedFilter.path.join(".")}`]: getFilter(detailedFilter.filter)
      }
    };
  } else if(detailedFilter.type === "$term_highlight"){
    const fieldName = detailedFilter.fieldName? checkFieldname(detailedFilter.fieldName, opts?.columns) : "*"
    return {
      $term_highlight: [[fieldName], parseContextVal(detailedFilter), { matchCase: false, edgeTruncate: 30, returnType: "boolean" } ]
    };
  };

  return getFilter(detailedFilter, opts?.columns)
}


export type GroupedDetailedFilter =
| { $and: (SimpleFilter | GroupedDetailedFilter)[] } 
| { $or: (SimpleFilter | GroupedDetailedFilter)[] } 