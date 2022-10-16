"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinalFilter = exports.getFinalFilterInfo = exports.isDetailedFilter = exports.isJoinedFilter = exports.JOINED_FILTER_TYPES = exports.DATE_FILTER_TYPES = exports.NUMERIC_FILTER_TYPES = exports.TEXT_FILTER_TYPES = exports.FTS_FILTER_TYPES = exports.CORE_FILTER_TYPES = exports.isDefined = void 0;
const isDefined = (v) => v !== undefined && v !== null;
exports.isDefined = isDefined;
exports.CORE_FILTER_TYPES = [
    { key: "=", label: "=" },
    { key: "<>", label: "!=" },
    { key: "not null", label: "NOT NULL" },
    { key: "null", label: "NULL" },
    { key: "$in", label: "IN" },
    { key: "$nin", label: "NOT IN" },
];
exports.FTS_FILTER_TYPES = [
    { key: "@@.to_tsquery", label: "to_tsquery" },
    { key: "@@.plainto_tsquery", label: "plainto_tsquery" },
    { key: "@@.phraseto_tsquery", label: "phraseto_tsquery" },
    { key: "@@.websearch_to_tsquery", label: "websearch_to_tsquery" },
];
exports.TEXT_FILTER_TYPES = [
    { key: "$ilike", label: "ILIKE" },
    { key: "$like", label: "LIKE" },
    { key: "$term_highlight", label: "CONTAINS" },
    // { key: "$ilikeNOT", label: "NOT ILIKE"},
    // { key: "$likeNOT", label: "NOT LIKE"},
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
exports.JOINED_FILTER_TYPES = ["$existsJoined", "$notExistsJoined"];
const isJoinedFilter = (f) => Boolean(f.type && exports.JOINED_FILTER_TYPES.includes(f.type));
exports.isJoinedFilter = isJoinedFilter;
const isDetailedFilter = (f) => !(0, exports.isJoinedFilter)(f.type);
exports.isDetailedFilter = isDetailedFilter;
const getFinalFilterInfo = (fullFilter, context, depth = 0) => {
    const filterToString = (filter) => {
        const f = (0, exports.getFinalFilter)(filter, context, { forInfoOnly: true });
        if (!f)
            return undefined;
        const fieldNameAndOperator = Object.keys(f)[0];
        // console.log(fieldNameAndOperator)
        if (fieldNameAndOperator === "$term_highlight") {
            const [fields, value, args] = f[fieldNameAndOperator];
            const { matchCase } = args;
            return `${fields} contain ${matchCase ? "(case sensitive)" : ""} ${value}`;
        }
        return `${fieldNameAndOperator} ${JSON.stringify(f[fieldNameAndOperator])}`.split(".$").join(" "); //.split(" ").map((v, i) => i? v.toUpperCase() : v).join(" ");
    };
    let result = "";
    if (fullFilter) {
        const isAnd = "$and" in fullFilter;
        if (isAnd || "$or" in fullFilter) {
            // @ts-ignore
            const finalFilters = fullFilter[isAnd ? "$and" : "$or"].map(f => (0, exports.getFinalFilterInfo)(f, context, depth + 1)).filter(exports.isDefined);
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
        if ((context || forInfoOnly) && f.contextValue) {
            if (forInfoOnly) {
                return `{{${f.contextValue.objectName}.${f.contextValue.objectPropertyName}}}`;
            }
            //@ts-ignore
            return context[f.contextValue.objectName]?.[f.contextValue.objectPropertyName];
        }
        return ({ ...f }).value;
    };
    const getFilter = (f, columns) => {
        const val = parseContextVal(f);
        const fieldName = checkFieldname(f.fieldName, columns);
        if (f.type === "$age" || f.type === "$duration") {
            const { comparator, argsLeftToRight = true, otherField } = f.complexFilter ?? {};
            const $age = f.type === "$age" ? [fieldName] : [fieldName, otherField].filter(exports.isDefined);
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
        return {
            [`${fieldName}.${detailedFilter.type}`]: [
                parseContextVal(detailedFilter)
            ]
        };
    }
    else if ((0, exports.isJoinedFilter)(detailedFilter)) {
        return {
            [detailedFilter.type]: {
                [`${detailedFilter.path.join(".")}`]: getFilter(detailedFilter.filter)
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