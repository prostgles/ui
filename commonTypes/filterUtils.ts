import { ContextDataObject, ContextValue } from "./publishUtils";

export const isDefined = <T>(v: T | undefined | void): v is T =>
  v !== undefined && v !== null;

export const CORE_FILTER_TYPES = [
  { key: "=", label: "=" },
  { key: "<>", label: "!=" },
  { key: "$in", label: "IN" },
  { key: "$nin", label: "NOT IN" },
  { key: "not null", label: "IS NOT NULL" },
  { key: "null", label: "IS NULL" },
  { key: "$term_highlight", label: "CONTAINS" },
] as const;

export const FTS_FILTER_TYPES = [
  {
    key: "@@.to_tsquery",
    label: "Search",
    subLabel:
      "(to_tsquery) normalizes each token into a lexeme using the specified or default configuration, and discards any tokens that are stop words according to the configuration",
  },
  {
    key: "@@.plainto_tsquery",
    label: "Plain search",
    subLabel:
      "(plainto_tsquery) The text is parsed and normalized much as for to_tsvector, then the & (AND) tsquery operator is inserted between surviving words",
  },
  {
    key: "@@.phraseto_tsquery",
    label: "Phrase search",
    subLabel:
      "(phraseto_tsquery) phraseto_tsquery behaves much like plainto_tsquery, except that it inserts the <-> (FOLLOWED BY) operator between surviving words instead of the & (AND) operator. Also, stop words are not simply discarded, but are accounted for by inserting <N> operators rather than <-> operators. This function is useful when searching for exact lexeme sequences, since the FOLLOWED BY operators check lexeme order not just the presence of all the lexemes",
  },
  {
    key: "@@.websearch_to_tsquery",
    label: "Web search",
    subLabel:
      "(websearch_to_tsquery) Unlike plainto_tsquery and phraseto_tsquery, it also recognizes certain operators. Moreover, this function will never raise syntax errors, which makes it possible to use raw user-supplied input for search. The following syntax is supported",
  },
] as const;
const likeInfo =
  "Operators: '%' - match any sequence of characters; '_' - match any single character " as const;
export const TEXT_FILTER_TYPES = [
  {
    key: "$ilike",
    label: "ILIKE",
    subLabel: "Case-insensitive text search. " + likeInfo,
  },
  {
    key: "$like",
    label: "LIKE",
    subLabel: "Case-sensitive text search. " + likeInfo,
  },
  { key: "$nilike", label: "NOT ILIKE" },
  { key: "$nlike", label: "NOT LIKE" },
  // { key: "$term_highlightNOT", label: "DOES NOT CONTAIN"},
] as const;

export const NUMERIC_FILTER_TYPES = [
  { key: "$between", label: "Between" },
  { key: ">", label: ">" },
  { key: ">=", label: ">=" },
  { key: "<", label: "<" },
  { key: "<=", label: "<=" },
] as const;

export const DATE_FILTER_TYPES = [
  { key: "$age", label: "Age at start of day" },
  { key: "$ageNow", label: "Age" },
  { key: "$duration", label: "Duration" },
] as const;

export const GEO_FILTER_TYPES = [
  { key: "$ST_DWithin", label: "Within" },
] as const;

export type FilterType =
  | (typeof CORE_FILTER_TYPES)[number]["key"]
  | (typeof FTS_FILTER_TYPES)[number]["key"]
  | (typeof TEXT_FILTER_TYPES)[number]["key"]
  | (typeof NUMERIC_FILTER_TYPES)[number]["key"]
  | (typeof DATE_FILTER_TYPES)[number]["key"]
  | (typeof GEO_FILTER_TYPES)[number]["key"];

export type BaseFilter = {
  minimised?: boolean;
  disabled?: boolean;
};
export const JOINED_FILTER_TYPES = [
  "$existsJoined",
  "$notExistsJoined",
] as const;
type ComplexFilterDetailed =
  | {
      type: "controlled";
      funcName: string | undefined;
      argsLeftToRight: boolean;
      comparator: string;
      otherField?: string | null;
    }
  | {
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

export const isJoinedFilter = (f: SimpleFilter): f is JoinedFilter =>
  Boolean(f.type && JOINED_FILTER_TYPES.includes(f.type as any));
export const isDetailedFilter = (f: SimpleFilter): f is DetailedFilterBase =>
  !isJoinedFilter(f.type as any);

type InfoType = "pg";
export const getFinalFilterInfo = (
  fullFilter?: GroupedDetailedFilter | SimpleFilter,
  context?: ContextDataObject,
  depth = 0,
  opts?: { for: InfoType },
): string => {
  const forPg = opts?.for === "pg";
  const filterToString = (filter: SimpleFilter): string | undefined => {
    if (!Object.keys(filter).length) {
      return undefined;
    }
    if (filter.type === "$ST_DWithin") {
      const v = filter.value;
      if (forPg) {
        return `ST_DWithin(${filter.fieldName}, 'SRID=4326;POINT(${v.lng} ${v.lat})', ${v.distance})`;
      }
      return `${(v.distance / 1000).toFixed(3)}Km of ${v?.name ?? [v.lat, v.lng].join(", ")}`;
    }

    if (filter.type === "$existsJoined" || filter.type === "$notExistsJoined") {
      const path = filter.path
        .map((p) => (typeof p === "string" ? p : p.table))
        .join(" -> ");
      return `${filter.type === "$existsJoined" ? "Exists" : "Does not exist"} in ${path} where ${filterToString(filter.filter)}`;
    }

    const f = getFinalFilter(filter, context, {
      forInfoOnly: opts?.for ?? true,
    });
    if (!f) return undefined;

    const fieldNameAndOperator = Object.keys(f)[0];
    if (!fieldNameAndOperator) return undefined;
    if (fieldNameAndOperator === "$term_highlight") {
      const [fields, value, args] = f[fieldNameAndOperator];
      const { matchCase } = args;
      if (forPg) {
        return `(${fields.map((f: string) => `${f} ${matchCase ? "LIKE" : "ILIKE"} '%${value}%'`).join(" OR ")})`;
      }
      return `${fields} contain ${matchCase ? "(case sensitive)" : ""} ${value}`;
    }
    const [fieldName, operator = "="] = fieldNameAndOperator.split(".$");
    const value = f[fieldNameAndOperator];
    if ("fieldName" in filter && filter.contextValue?.objectName === "user") {
      return `${fieldName}::TEXT ${operator} ${value}`;
    }
    const valueStr =
      ["number", "boolean"].includes(typeof value) ? value
      : value === null ? `null`
      : value === undefined ? ``
      : `'${JSON.stringify(value).slice(1, -1)}'`;
    return `${fieldName} ${operator} ${valueStr}`;
  };

  let result = "";
  if (fullFilter) {
    const isAnd = "$and" in fullFilter;
    if (isAnd || "$or" in fullFilter) {
      // @ts-ignore
      const finalFilters = fullFilter[isAnd ? "$and" : "$or"]
        .map((f: any) => getFinalFilterInfo(f, context, depth + 1, opts))
        .filter(isDefined)
        .filter((v: string) => v.trim().length);
      const finalFilterStr = finalFilters.join(isAnd ? " AND " : " OR ");
      return finalFilters.length > 1 && depth > 1 ?
          `( ${finalFilterStr} )`
        : finalFilterStr;
    }

    return filterToString(fullFilter) ?? "";
  }

  return result;
};

export const parseContextVal = (
  f: DetailedFilterBase,
  context: ContextDataObject | undefined,
  { forInfoOnly }: GetFinalFilterOpts = {},
): any => {
  if (f.contextValue) {
    if (forInfoOnly) {
      const objPath = `${f.contextValue.objectName}.${f.contextValue.objectPropertyName}`;
      if (forInfoOnly === "pg") {
        if (f.contextValue.objectName === "user") {
          return `prostgles.user('${f.contextValue.objectPropertyName}')`;
        }
        return `current_setting('${objPath}')`;
      }
      return `{{${objPath}}}`;
    }
    if (context) {
      //@ts-ignore
      return context[f.contextValue.objectName]?.[
        f.contextValue.objectPropertyName
      ];
    }

    return undefined;
  }

  return { ...f }.value;
};

type GetFinalFilterOpts = {
  forInfoOnly?: boolean | InfoType;
  columns?: string[];
};
export const getFinalFilter = (
  detailedFilter: SimpleFilter,
  context?: ContextDataObject,
  opts?: GetFinalFilterOpts,
) => {
  const { forInfoOnly = false } = opts ?? {};

  const checkFieldname = (f: string, columns?: string[]) => {
    if (columns?.length && !columns.includes(f)) {
      throw new Error(
        `${f} is not a valid field name. \nExpecting one of: ${columns.join(", ")}`,
      );
    }

    return f;
  };

  if (
    ("fieldName" in detailedFilter && detailedFilter.disabled) ||
    (isJoinedFilter(detailedFilter) && detailedFilter.filter.disabled)
  )
    return undefined;

  const getFilter = (
    f: DetailedFilterBase,
    columns?: string[],
  ): Record<string, any> => {
    const val = parseContextVal(f, context, opts);
    const fieldName = checkFieldname(f.fieldName, columns);

    if (f.contextValue && !context && !forInfoOnly) {
      return {};
    }

    if (
      FTS_FILTER_TYPES.some((fts) => fts.key === f.type) &&
      "fieldName" in f
    ) {
      const fieldName = checkFieldname(f.fieldName, opts?.columns);
      const { ftsFilterOptions } = f;
      return {
        [`${fieldName}.${f.type}`]: [
          ...(ftsFilterOptions ? [ftsFilterOptions.lang] : []),
          parseContextVal(f, context, opts),
        ],
      };
    } else if (f.type === "$term_highlight") {
      const fieldName =
        f.fieldName ? checkFieldname(f.fieldName, opts?.columns) : "*";
      return {
        $term_highlight: [
          [fieldName],
          parseContextVal(f, context, opts),
          { matchCase: false, edgeTruncate: 30, returnType: "boolean" },
        ],
      };
    } else if (f.type == "$ST_DWithin") {
      return {
        $filter: [{ $ST_DWithin: [fieldName, { ...val }] }],
      };
    } else if (
      f.complexFilter ||
      f.type?.startsWith("$age") ||
      f.type === "$duration"
    ) {
      const isAgeOrDuration =
        f.type?.startsWith("$age") || f.type === "$duration";
      if (isAgeOrDuration) {
        if (f.complexFilter && f.complexFilter.type !== "controlled") {
          throw new Error(
            "Only controlled complex filters are allowed for age and duration filters",
          );
        }
        const {
          comparator,
          argsLeftToRight = true,
          otherField,
        } = f.complexFilter ?? {};

        const filterArgs =
          f.type === "$age" ?
            [fieldName]
          : [fieldName, otherField].filter(isDefined);

        if (!argsLeftToRight) filterArgs.reverse();
        return {
          $filter: [
            { [f.type === "$ageNow" ? "$ageNow" : "$age"]: filterArgs },
            comparator,
            val,
          ],
        };
      } else if (f.complexFilter) {
        if (f.complexFilter.type !== "$filter") {
          throw new Error("Unexpected complex filter");
        }

        return {
          $filter: [f.complexFilter.leftExpression, f.type, val],
        };
      }
    }
    if (f.type === "not null") {
      return {
        [fieldName + ".<>"]: null,
      };
    }
    if (f.type === "null") {
      return {
        [fieldName]: null,
      };
    }
    return {
      [[fieldName, f.type === "=" ? null : f.type].filter((v) => v).join(".")]:
        val,
    };
  };

  if (isJoinedFilter(detailedFilter)) {
    return {
      [detailedFilter.type]: {
        path: detailedFilter.path,
        filter: getFilter(detailedFilter.filter),
      },
    };
  }

  return getFilter(detailedFilter, opts?.columns);
};

export type GroupedDetailedFilter =
  | { $and: (SimpleFilter | GroupedDetailedFilter)[] }
  | { $or: (SimpleFilter | GroupedDetailedFilter)[] };
