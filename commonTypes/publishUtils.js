var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { getFinalFilter, isDefined } from "./filterUtils";
export function isObject(obj) {
    return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}
export const parseFieldFilter = (args) => {
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
export const parseFullFilter = (filter, context) => {
    const isAnd = "$and" in filter;
    const filters = isAnd ? filter.$and : filter.$or;
    const finalFilters = filters.map(f => getFinalFilter(f, context)).filter(isDefined);
    const f = isAnd ? { $and: finalFilters } : { $or: finalFilters };
    return f;
};
export const parseForcedFilter = (rule, context) => {
    if (isObject(rule) && "forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
        const forcedFilter = parseFullFilter(rule.forcedFilterDetailed, context);
        if (forcedFilter)
            return { forcedFilter };
    }
    return undefined;
};
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
    if (!(value === null || value === void 0 ? void 0 : value.forcedDataDetail))
        return undefined;
    let forcedData = {};
    value === null || value === void 0 ? void 0 : value.forcedDataDetail.forEach(v => {
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
    return Object.assign(Object.assign(Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseForcedFilter(rule, context)), (rule.orderByFields && { orderByFields: getValidatedFieldFilter(rule.orderByFields, columns, false) })), (rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) }));
};
const parseUpdate = (rule, columns, context) => {
    var _a;
    if (!rule || rule === true)
        return rule;
    return Object.assign(Object.assign(Object.assign(Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseForcedFilter(rule, context)), parseForcedData(rule, context, columns)), (rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) })), (((_a = rule.dynamicFields) === null || _a === void 0 ? void 0 : _a.length) && {
        dynamicFields: rule.dynamicFields.map(v => ({
            fields: getValidatedFieldFilter(v.fields, columns),
            filter: parseFullFilter(v.filterDetailed, context)
        }))
    }));
};
const parseInsert = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseForcedData(rule, context, columns));
};
const parseDelete = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return Object.assign(Object.assign({}, parseForcedFilter(rule, context)), { filterFields: getValidatedFieldFilter(rule.filterFields, columns) });
};
export const parseTableRules = (rules, isView = false, columns, context) => {
    if (rules === true || rules === "*") {
        return true;
    }
    if (isObject(rules)) {
        return Object.assign({ select: parseSelect(rules.select, columns, context) }, (!isView ? {
            insert: parseInsert(rules.insert, columns, context),
            update: parseUpdate(rules.update, columns, context),
            delete: parseDelete(rules.delete, columns, context),
        } : {}));
    }
    return false;
};
export const validateDynamicFields = async (dynamicFields, db, context) => {
    var e_1, _a, e_2, _b;
    if (!dynamicFields)
        return {};
    try {
        for (var _c = __asyncValues(dynamicFields.entries()), _d; _d = await _c.next(), !_d.done;) {
            const [dfIndex, dfRule] = _d.value;
            const filter = await parseFullFilter(dfRule.filterDetailed, context);
            if (!filter)
                throw "dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule);
            await db.find(filter, { limit: 0 });
            try {
                /** Ensure dynamicFields filters do not overlap */
                for (var _e = (e_2 = void 0, __asyncValues(dynamicFields.entries())), _f; _f = await _e.next(), !_f.done;) {
                    const [_dfIndex, _dfRule] = _f.value;
                    if (dfIndex !== _dfIndex) {
                        const _filter = await parseFullFilter(_dfRule.filterDetailed, context);
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) await _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) await _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return {};
};
