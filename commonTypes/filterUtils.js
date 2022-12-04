export const isDefined = (v) => v !== undefined && v !== null;
export const CORE_FILTER_TYPES = [
    { key: "=", label: "=" },
    { key: "<>", label: "!=" },
    { key: "not null", label: "IS NOT NULL" },
    { key: "null", label: "IS NULL" },
    { key: "$in", label: "IN" },
    { key: "$nin", label: "NOT IN" },
];
export const FTS_FILTER_TYPES = [
    { key: "@@.to_tsquery", label: "to_tsquery" },
    { key: "@@.plainto_tsquery", label: "plainto_tsquery" },
    { key: "@@.phraseto_tsquery", label: "phraseto_tsquery" },
    { key: "@@.websearch_to_tsquery", label: "websearch_to_tsquery" },
];
export const TEXT_FILTER_TYPES = [
    { key: "$ilike", label: "ILIKE" },
    { key: "$like", label: "LIKE" },
    { key: "$term_highlight", label: "CONTAINS" },
    // { key: "$ilikeNOT", label: "NOT ILIKE"},
    // { key: "$likeNOT", label: "NOT LIKE"},
    // { key: "$term_highlightNOT", label: "DOES NOT CONTAIN"},
];
export const NUMERIC_FILTER_TYPES = [
    { key: "$between", label: "Between" },
    { key: ">", label: ">" },
    { key: ">=", label: ">=" },
    { key: "<", label: "<" },
    { key: "<=", label: "<=" },
];
export const DATE_FILTER_TYPES = [
    { key: "$age", label: "Age" },
    { key: "$ageNow", label: "Age exact" },
    { key: "$duration", label: "Duration" },
];
export const JOINED_FILTER_TYPES = ["$existsJoined", "$notExistsJoined"];
export const isJoinedFilter = (f) => Boolean(f.type && JOINED_FILTER_TYPES.includes(f.type));
export const isDetailedFilter = (f) => !isJoinedFilter(f.type);
export const getFinalFilterInfo = (fullFilter, context, depth = 0) => {
    var _a;
    const filterToString = (filter) => {
        const f = getFinalFilter(filter, context, { forInfoOnly: true });
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
            const finalFilters = fullFilter[isAnd ? "$and" : "$or"].map(f => getFinalFilterInfo(f, context, depth + 1)).filter(isDefined);
            const finalFilterStr = finalFilters.join(isAnd ? " AND " : " OR ");
            return (finalFilters.length > 1 && depth > 1) ? `( ${finalFilterStr} )` : finalFilterStr;
        }
        return (_a = filterToString(fullFilter)) !== null && _a !== void 0 ? _a : "";
    }
    return result;
};
export const getFinalFilter = (detailedFilter, context, opts) => {
    const { forInfoOnly = false } = opts !== null && opts !== void 0 ? opts : {};
    const checkFieldname = (f, columns) => {
        if ((columns === null || columns === void 0 ? void 0 : columns.length) && !columns.includes(f)) {
            throw new Error(`${f} is not a valid field name. \nExpecting one of: ${columns.join(", ")}`);
        }
        return f;
    };
    if ("fieldName" in detailedFilter && detailedFilter.disabled || isJoinedFilter(detailedFilter) && detailedFilter.filter.disabled)
        return undefined;
    const parseContextVal = (f) => {
        var _a;
        if ((context || forInfoOnly) && f.contextValue) {
            if (forInfoOnly) {
                return `{{${f.contextValue.objectName}.${f.contextValue.objectPropertyName}}}`;
            }
            //@ts-ignore
            return (_a = context[f.contextValue.objectName]) === null || _a === void 0 ? void 0 : _a[f.contextValue.objectPropertyName];
        }
        return (Object.assign({}, f)).value;
    };
    const getFilter = (f, columns) => {
        var _a;
        const val = parseContextVal(f);
        const fieldName = checkFieldname(f.fieldName, columns);
        if (f.type === "$age" || f.type === "$duration") {
            const { comparator, argsLeftToRight = true, otherField } = (_a = f.complexFilter) !== null && _a !== void 0 ? _a : {};
            const $age = f.type === "$age" ? [fieldName] : [fieldName, otherField].filter(isDefined);
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
    if (FTS_FILTER_TYPES.some(f => f.key === detailedFilter.type) && "fieldName" in detailedFilter) {
        const fieldName = checkFieldname(detailedFilter.fieldName, opts === null || opts === void 0 ? void 0 : opts.columns);
        return {
            [`${fieldName}.${detailedFilter.type}`]: [
                parseContextVal(detailedFilter)
            ]
        };
    }
    else if (isJoinedFilter(detailedFilter)) {
        return {
            [detailedFilter.type]: {
                [`${detailedFilter.path.join(".")}`]: getFilter(detailedFilter.filter)
            }
        };
    }
    else if (detailedFilter.type === "$term_highlight") {
        const fieldName = detailedFilter.fieldName ? checkFieldname(detailedFilter.fieldName, opts === null || opts === void 0 ? void 0 : opts.columns) : "*";
        return {
            $term_highlight: [[fieldName], parseContextVal(detailedFilter), { matchCase: false, edgeTruncate: 30, returnType: "boolean" }]
        };
    }
    ;
    return getFilter(detailedFilter, opts === null || opts === void 0 ? void 0 : opts.columns);
};
