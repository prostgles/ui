"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDynamicFields = exports.parseTableRules = exports.parseForcedFilter = exports.parseFullFilter = exports.parseFieldFilter = exports.isObject = void 0;
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
const parseFullFilter = (filter, context) => {
    const isAnd = "$and" in filter;
    const filters = isAnd ? filter.$and : filter.$or;
    const finalFilters = filters.map(f => (0, filterUtils_1.getFinalFilter)(f, context)).filter(filterUtils_1.isDefined);
    const f = isAnd ? { $and: finalFilters } : { $or: finalFilters };
    return f;
};
exports.parseFullFilter = parseFullFilter;
const parseForcedFilter = (rule, context) => {
    if (isObject(rule) && "forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
        const forcedFilter = (0, exports.parseFullFilter)(rule.forcedFilterDetailed, context);
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
        throw "Must select at least a field";
    if (values.some(v => v) && values.some(v => !v)) {
        throw "Invalid field filter: must have only include or exclude. Cannot have both";
    }
    if (!values.every(v => [0, 1, true, false].includes(v))) {
        throw "Invalid field filter: field values can only be one of 0,1,true,false";
    }
    const badCols = keys.filter(c => !columns.includes(c));
    if (badCols.length) {
        throw `Invalid columns provided: ${badCols}`;
    }
    return value;
};
const parseForcedData = (value, context, columns) => {
    if (!value?.forcedDataDetail)
        return undefined;
    let forcedData = {};
    value?.forcedDataDetail.forEach(v => {
        if (!columns.includes(v.fieldName))
            `Invalid fieldName in forced data ${v.fieldName}`;
        if (v.fieldName in forcedData)
            throw `Duplicate forced data (${v.fieldName}) found in ${JSON.stringify(value)}`;
        if (v.type === "fixed") {
            forcedData[v.fieldName] = v.value;
        }
        else {
            const obj = context[v.objectName];
            if (!obj)
                throw `Invalid objectName (${v.objectName}) found in forcedData`;
            if (!(v.objectPropertyName in obj))
                throw `Invalid/missing objectPropertyName (${v.objectPropertyName}) found in forcedData`;
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
        ...(0, exports.parseForcedFilter)(rule, context),
        ...(rule.orderByFields && { orderByFields: getValidatedFieldFilter(rule.orderByFields, columns, false) }),
        ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) })
    };
};
const parseUpdate = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return {
        fields: getValidatedFieldFilter(rule.fields, columns),
        ...(0, exports.parseForcedFilter)(rule, context),
        ...parseForcedData(rule, context, columns),
        ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) }),
        ...(rule.dynamicFields?.length && {
            dynamicFields: rule.dynamicFields.map(v => ({
                fields: getValidatedFieldFilter(v.fields, columns),
                filter: (0, exports.parseFullFilter)(v.filterDetailed, context)
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
        ...(0, exports.parseForcedFilter)(rule, context),
        filterFields: getValidatedFieldFilter(rule.filterFields, columns),
    };
};
const parseTableRules = (rules, isView = false, columns, context) => {
    if (rules === true || rules === "*") {
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
const validateDynamicFields = async (dynamicFields, db, context) => {
    if (!dynamicFields)
        return {};
    for await (const [dfIndex, dfRule] of dynamicFields.entries()) {
        const filter = await (0, exports.parseFullFilter)(dfRule.filterDetailed, context);
        if (!filter)
            throw "dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule);
        await db.find(filter, { limit: 0 });
        /** Ensure dynamicFields filters do not overlap */
        for await (const [_dfIndex, _dfRule] of dynamicFields.entries()) {
            if (dfIndex !== _dfIndex) {
                const _filter = await (0, exports.parseFullFilter)(_dfRule.filterDetailed, context);
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
//# sourceMappingURL=publishUtils.js.map