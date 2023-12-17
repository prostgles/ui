"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinalFilter = exports.getFinalFilterInfo = exports.isDetailedFilter = exports.isJoinedFilter = exports.JOINED_FILTER_TYPES = exports.GEO_FILTER_TYPES = exports.DATE_FILTER_TYPES = exports.NUMERIC_FILTER_TYPES = exports.TEXT_FILTER_TYPES = exports.FTS_FILTER_TYPES = exports.CORE_FILTER_TYPES = exports.isDefined = void 0;
const isDefined = (v) => v !== undefined && v !== null;
exports.isDefined = isDefined;
exports.CORE_FILTER_TYPES = [
    { key: "=", label: "=" },
    { key: "<>", label: "!=" },
    { key: "not null", label: "IS NOT NULL" },
    { key: "null", label: "IS NULL" },
    { key: "$in", label: "IN" },
    { key: "$nin", label: "NOT IN" },
    { key: "$term_highlight", label: "CONTAINS" },
];
exports.FTS_FILTER_TYPES = [
    { key: "@@.to_tsquery", label: "Search", subLabel: "(to_tsquery) normalizes each token into a lexeme using the specified or default configuration, and discards any tokens that are stop words according to the configuration" },
    { key: "@@.plainto_tsquery", label: "Plain search", subLabel: "(plainto_tsquery) The text is parsed and normalized much as for to_tsvector, then the & (AND) tsquery operator is inserted between surviving words" },
    { key: "@@.phraseto_tsquery", label: "Phrase search", subLabel: "(phraseto_tsquery) phraseto_tsquery behaves much like plainto_tsquery, except that it inserts the <-> (FOLLOWED BY) operator between surviving words instead of the & (AND) operator. Also, stop words are not simply discarded, but are accounted for by inserting <N> operators rather than <-> operators. This function is useful when searching for exact lexeme sequences, since the FOLLOWED BY operators check lexeme order not just the presence of all the lexemes" },
    { key: "@@.websearch_to_tsquery", label: "Web search", subLabel: "(websearch_to_tsquery) Unlike plainto_tsquery and phraseto_tsquery, it also recognizes certain operators. Moreover, this function will never raise syntax errors, which makes it possible to use raw user-supplied input for search. The following syntax is supported" },
];
const likeInfo = "Operators: '%' - match any sequence of characters; '_' - match any single character ";
exports.TEXT_FILTER_TYPES = [
    { key: "$ilike", label: "ILIKE", subLabel: "Case-insensitive text search. " + likeInfo },
    { key: "$like", label: "LIKE", subLabel: "Case-sensitive text search. " + likeInfo },
    { key: "$nilike", label: "NOT ILIKE" },
    { key: "$nlike", label: "NOT LIKE" },
    // { key: "$term_highlightNOT", label: "DOES NOT CONTAIN"},
];
exports.NUMERIC_FILTER_TYPES = [
    { key: "$between", label: "Between" },
    { key: ">", label: ">" },
    { key: ">=", label: ">=" },
    { key: "<", label: "<" },
    { key: "<=", label: "<=" },
];
exports.DATE_FILTER_TYPES = [
    { key: "$age", label: "Age" },
    { key: "$ageNow", label: "Age exact" },
    { key: "$duration", label: "Duration" },
];
exports.GEO_FILTER_TYPES = [
    { key: "$ST_DWithin", label: "Within" },
];
exports.JOINED_FILTER_TYPES = ["$existsJoined", "$notExistsJoined"];
const isJoinedFilter = (f) => Boolean(f.type && exports.JOINED_FILTER_TYPES.includes(f.type));
exports.isJoinedFilter = isJoinedFilter;
const isDetailedFilter = (f) => !(0, exports.isJoinedFilter)(f.type);
exports.isDetailedFilter = isDetailedFilter;
const getFinalFilterInfo = (fullFilter, context, depth = 0, opts) => {
    const forPg = opts?.for === "pg";
    const filterToString = (filter) => {
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
        const f = (0, exports.getFinalFilter)(filter, context, { forInfoOnly: opts?.for ?? true });
        if (!f)
            return undefined;
        const fieldNameAndOperator = Object.keys(f)[0];
        if (!fieldNameAndOperator)
            return undefined;
        if (fieldNameAndOperator === "$term_highlight") {
            const [fields, value, args] = f[fieldNameAndOperator];
            const { matchCase } = args;
            if (forPg) {
                return `(${fields.map((f) => `${f} ${matchCase ? "LIKE" : "ILIKE"} '%${value}%'`).join(" OR ")})`;
            }
            return `${fields} contain ${matchCase ? "(case sensitive)" : ""} ${value}`;
        }
        const [fieldName, operator = "="] = fieldNameAndOperator.split(".$");
        const value = f[fieldNameAndOperator];
        if ("fieldName" in filter && filter.contextValue?.objectName === "user") {
            return `${fieldName}::TEXT ${operator} ${value}`;
        }
        const valueStr = ["number", "boolean"].includes(typeof value) ? value :
            value === null ? `null` :
                value === undefined ? `` :
                    `'${JSON.stringify(value).slice(1, -1)}'`;
        return `${fieldName} ${operator} ${valueStr}`;
    };
    let result = "";
    if (fullFilter) {
        const isAnd = "$and" in fullFilter;
        if (isAnd || "$or" in fullFilter) {
            // @ts-ignore
            const finalFilters = fullFilter[isAnd ? "$and" : "$or"]
                .map((f) => (0, exports.getFinalFilterInfo)(f, context, depth + 1, opts)).filter(exports.isDefined)
                .filter((v) => v.trim().length);
            const finalFilterStr = finalFilters.join(isAnd ? " AND " : " OR ");
            return (finalFilters.length > 1 && depth > 1) ? `( ${finalFilterStr} )` : finalFilterStr;
        }
        return filterToString(fullFilter) ?? "";
    }
    return result;
};
exports.getFinalFilterInfo = getFinalFilterInfo;
const getFinalFilter = (detailedFilter, context, opts) => {
    const { forInfoOnly = false } = opts ?? {};
    const checkFieldname = (f, columns) => {
        if (columns?.length && !columns.includes(f)) {
            throw new Error(`${f} is not a valid field name. \nExpecting one of: ${columns.join(", ")}`);
        }
        return f;
    };
    if ("fieldName" in detailedFilter && detailedFilter.disabled || (0, exports.isJoinedFilter)(detailedFilter) && detailedFilter.filter.disabled)
        return undefined;
    const parseContextVal = (f) => {
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
                return context[f.contextValue.objectName]?.[f.contextValue.objectPropertyName];
            }
            return undefined;
        }
        return ({ ...f }).value;
    };
    const getFilter = (f, columns) => {
        const val = parseContextVal(f);
        const fieldName = checkFieldname(f.fieldName, columns);
        if (f.contextValue && !context && !forInfoOnly) {
            return {};
        }
        if (f.type == "$ST_DWithin") {
            return {
                $filter: [
                    { $ST_DWithin: [fieldName, { ...val }] },
                ]
            };
        }
        else if (f.type?.startsWith("$age") || f.type === "$duration") {
            const { comparator, argsLeftToRight = true, otherField } = f.complexFilter ?? {};
            const $age = f.type === "$age" ? [fieldName] :
                [fieldName, otherField].filter(exports.isDefined);
            if (!argsLeftToRight)
                $age.reverse();
            return {
                $filter: [
                    { $age },
                    comparator,
                    val
                ]
            };
        }
        if (f.type === "not null") {
            return {
                [fieldName + ".<>"]: null
            };
        }
        if (f.type === "null") {
            return {
                [fieldName]: null
            };
        }
        return {
            [[fieldName, f.type === "=" ? null : f.type].filter(v => v).join(".")]: val
        };
    };
    if (exports.FTS_FILTER_TYPES.some(f => f.key === detailedFilter.type) && "fieldName" in detailedFilter) {
        const fieldName = checkFieldname(detailedFilter.fieldName, opts?.columns);
        const { ftsFilterOptions } = detailedFilter;
        return {
            [`${fieldName}.${detailedFilter.type}`]: [
                ...(ftsFilterOptions ? [ftsFilterOptions.lang] : []),
                parseContextVal(detailedFilter)
            ]
        };
    }
    else if ((0, exports.isJoinedFilter)(detailedFilter)) {
        return {
            [detailedFilter.type]: {
                path: detailedFilter.path,
                filter: getFilter(detailedFilter.filter)
            }
        };
    }
    else if (detailedFilter.type === "$term_highlight") {
        const fieldName = detailedFilter.fieldName ? checkFieldname(detailedFilter.fieldName, opts?.columns) : "*";
        return {
            $term_highlight: [[fieldName], parseContextVal(detailedFilter), { matchCase: false, edgeTruncate: 30, returnType: "boolean" }]
        };
    }
    ;
    return getFilter(detailedFilter, opts?.columns);
};
exports.getFinalFilter = getFinalFilter;
//# sourceMappingURL=filterUtils.js.map