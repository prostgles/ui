"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinalFilter = exports.isDetailedFilter = exports.isJoinedFilter = exports.JOINED_FILTER_TYPES = exports.DATE_FILTER_TYPES = exports.NUMERIC_FILTER_TYPES = exports.TEXT_FILTER_TYPES = exports.FTS_FILTER_TYPES = exports.CORE_FILTER_TYPES = void 0;
const prostgles_types_1 = require("prostgles-types");
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
    { key: "$duration", label: "Duration" },
];
exports.JOINED_FILTER_TYPES = ["$existsJoined", "$notExistsJoined"];
const isJoinedFilter = (f) => Boolean(f.type && exports.JOINED_FILTER_TYPES.includes(f.type));
exports.isJoinedFilter = isJoinedFilter;
const isDetailedFilter = (f) => !(0, exports.isJoinedFilter)(f.type);
exports.isDetailedFilter = isDetailedFilter;
const getFinalFilter = (detailedFilter) => {
    if ("fieldName" in detailedFilter && detailedFilter.disabled || (0, exports.isJoinedFilter)(detailedFilter) && detailedFilter.filter.disabled)
        return undefined;
    const getF = (f) => {
        let val = ({ ...f }).value;
        if (f.type === "$age" || f.type === "$duration") {
            const { comparator, argsLeftToRight = true, otherField } = f.complexFilter ?? {};
            const $age = f.type === "$age" ? [f.fieldName] : [f.fieldName, otherField].filter(prostgles_types_1.isDefined);
            if (!argsLeftToRight)
                $age.reverse();
            return {
                $filter: [
                    { $age },
                    comparator,
                    f.value
                ]
            };
        }
        if (f.type === "not null") {
            return {
                [f.fieldName + ".<>"]: null
            };
        }
        if (f.type === "null") {
            return {
                [f.fieldName]: null
            };
        }
        return {
            [[f.fieldName, f.type === "=" ? null : f.type].filter(v => v).join(".")]: val
        };
    };
    if (exports.FTS_FILTER_TYPES.some(f => f.key === detailedFilter.type) && "fieldName" in detailedFilter) {
        return {
            [`${detailedFilter.fieldName}.${detailedFilter.type}`]: [
                detailedFilter.value
            ]
        };
    }
    else if ((0, exports.isJoinedFilter)(detailedFilter)) {
        return {
            [detailedFilter.type]: {
                [`${detailedFilter.path.join(".")}`]: getF(detailedFilter.filter)
            }
        };
    }
    else if (detailedFilter.type === "$term_highlight") {
        return {
            $term_highlight: [[detailedFilter.fieldName || "*"], detailedFilter.value, { matchCase: false, edgeTruncate: 30, returnType: "boolean" }]
        };
    }
    return getF(detailedFilter);
};
exports.getFinalFilter = getFinalFilter;
//# sourceMappingURL=filterUtils.js.map