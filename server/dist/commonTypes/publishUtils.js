"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCIDRRangesQuery = exports.validateDynamicFields = exports.getTableRulesErrors = exports.parseTableRules = exports.parseForcedFilter = exports.parseFullFilter = exports.parseFieldFilter = exports.isObject = void 0;
const filterUtils_1 = require("./filterUtils");
function isObject(obj) {
    return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}
exports.isObject = isObject;
const parseFieldFilter = (args) => {
    const { columns, fieldFilter } = args;
    if (!fieldFilter)
        return [];
    else if (fieldFilter === "*")
        return columns.slice();
    else if (Array.isArray(fieldFilter)) {
        if (!fieldFilter.length)
            return [];
        return columns.filter(c => fieldFilter.includes(c.toString()));
    }
    else if (isObject(fieldFilter) && Object.keys(fieldFilter).length) {
        const fields = Object.keys(fieldFilter);
        const isExcept = !Object.values(fieldFilter)[0];
        return columns.filter(c => isExcept ? !fields.includes(c) : fields.includes(c));
    }
    return [];
};
exports.parseFieldFilter = parseFieldFilter;
const parseFullFilter = (filter, context, columns) => {
    const isAnd = "$and" in filter;
    const filters = isAnd ? filter.$and : filter.$or;
    const finalFilters = filters.map(f => (0, filterUtils_1.getFinalFilter)(f, context, { columns })).filter(filterUtils_1.isDefined);
    const f = isAnd ? { $and: finalFilters } : { $or: finalFilters };
    return f;
};
exports.parseFullFilter = parseFullFilter;
const parseForcedFilter = (rule, context, columns) => {
    if (isObject(rule) && "forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
        const forcedFilter = (0, exports.parseFullFilter)(rule.forcedFilterDetailed, context, columns);
        if (forcedFilter)
            return { forcedFilter };
    }
    return undefined;
};
exports.parseForcedFilter = parseForcedFilter;
const getValidatedFieldFilter = (value, columns, expectAtLeastOne = true) => {
    if (value === "*")
        return value;
    const values = Object.values(value);
    const keys = Object.keys(value);
    if (!keys.length && expectAtLeastOne)
        throw new Error("Must select at least a field");
    if (values.some(v => v) && values.some(v => !v)) {
        throw new Error("Invalid field filter: must have only include or exclude. Cannot have both");
    }
    if (!values.every(v => [0, 1, true, false].includes(v))) {
        throw new Error("Invalid field filter: field values can only be one of 0,1,true,false");
    }
    const badCols = keys.filter(c => !columns.includes(c));
    if (badCols.length) {
        throw new Error(`Invalid columns provided: ${badCols}`);
    }
    return value;
};
const parseForcedData = (value, context, columns) => {
    if (!value?.forcedDataDetail)
        return undefined;
    let forcedData = {};
    value?.forcedDataDetail.forEach(v => {
        if (!columns.includes(v.fieldName))
            new Error(`Invalid fieldName in forced data ${v.fieldName}`);
        if (v.fieldName in forcedData)
            throw new Error(`Duplicate forced data (${v.fieldName}) found in ${JSON.stringify(value)}`);
        if (v.type === "fixed") {
            forcedData[v.fieldName] = v.value;
        }
        else {
            const obj = context[v.objectName];
            if (!obj)
                throw new Error(`Missing objectName (${v.objectName}) in forcedData`);
            if (!(v.objectPropertyName in obj))
                throw new Error(`Invalid/missing objectPropertyName (${v.objectPropertyName}) found in forcedData`);
            forcedData[v.fieldName] = obj[v.objectPropertyName];
        }
    });
    return { forcedData };
};
const parseSelect = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return {
        fields: getValidatedFieldFilter(rule.fields, columns),
        ...(0, exports.parseForcedFilter)(rule, context, columns),
        ...(rule.orderByFields && { orderByFields: getValidatedFieldFilter(rule.orderByFields, columns, false) }),
        ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) })
    };
};
const parseUpdate = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return {
        fields: getValidatedFieldFilter(rule.fields, columns),
        ...(0, exports.parseForcedFilter)(rule, context, columns),
        ...parseForcedData(rule, context, columns),
        ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) }),
        ...(rule.dynamicFields?.length && {
            dynamicFields: rule.dynamicFields.map(v => ({
                fields: getValidatedFieldFilter(v.fields, columns),
                filter: (0, exports.parseFullFilter)(v.filterDetailed, context, columns)
            }))
        })
    };
};
const parseInsert = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return {
        fields: getValidatedFieldFilter(rule.fields, columns),
        ...parseForcedData(rule, context, columns),
    };
};
const parseDelete = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return {
        ...(0, exports.parseForcedFilter)(rule, context, columns),
        filterFields: getValidatedFieldFilter(rule.filterFields, columns),
    };
};
const parseTableRules = (rules, isView = false, columns, context) => {
    if ([true, "*"].includes(rules)) {
        return true;
    }
    if (isObject(rules)) {
        return {
            select: parseSelect(rules.select, columns, context),
            ...(!isView ? {
                insert: parseInsert(rules.insert, columns, context),
                update: parseUpdate(rules.update, columns, context),
                delete: parseDelete(rules.delete, columns, context),
            } : {})
        };
    }
    return false;
};
exports.parseTableRules = parseTableRules;
const getTableRulesErrors = async (rules, tableColumns, contextData) => {
    let result = {};
    await Promise.all(Object.keys(rules).map(async (ruleKey) => {
        const key = ruleKey;
        const rule = rules[key];
        try {
            (0, exports.parseTableRules)({ [key]: rule }, false, tableColumns, contextData);
        }
        catch (err) {
            result[key] = err;
        }
    }));
    return result;
};
exports.getTableRulesErrors = getTableRulesErrors;
const validateDynamicFields = async (dynamicFields, db, context, columns) => {
    if (!dynamicFields)
        return {};
    for await (const [dfIndex, dfRule] of dynamicFields.entries()) {
        const filter = await (0, exports.parseFullFilter)(dfRule.filterDetailed, context, columns);
        if (!filter)
            throw new Error("dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule));
        await db.find(filter, { limit: 0 });
        /** Ensure dynamicFields filters do not overlap */
        for await (const [_dfIndex, _dfRule] of dynamicFields.entries()) {
            if (dfIndex !== _dfIndex) {
                const _filter = await (0, exports.parseFullFilter)(_dfRule.filterDetailed, context, columns);
                if (await db.findOne({ $and: [filter, _filter] }, { select: "" })) {
                    const error = `dynamicFields.filter cannot overlap each other. \n
          Overlapping dynamicFields rules:
              ${JSON.stringify(dfRule)} 
              AND
              ${JSON.stringify(_dfRule)} 
          `;
                    return { error };
                }
            }
        }
    }
    return {};
};
exports.validateDynamicFields = validateDynamicFields;
const getCIDRRangesQuery = (arg) => "select \
  host(${cidr}::cidr) AS \"from\",  \
  host(broadcast(${cidr}::cidr)) AS \"to\" ";
exports.getCIDRRangesQuery = getCIDRRangesQuery;
//# sourceMappingURL=publishUtils.js.map