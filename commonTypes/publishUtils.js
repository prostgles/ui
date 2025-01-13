var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { getFinalFilter, isDefined, } from "./filterUtils";
const OBJ_DEF_TYPES = [
    "boolean",
    "string",
    "number",
    "Date",
    "string[]",
    "number[]",
    "Date[]",
    "boolean[]",
];
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
        return columns.filter((c) => fieldFilter.includes(c.toString()));
    }
    else if (isObject(fieldFilter) && Object.keys(fieldFilter).length) {
        const fields = Object.keys(fieldFilter);
        const isExcept = !Object.values(fieldFilter)[0];
        return columns.filter((c) => isExcept ? !fields.includes(c) : fields.includes(c));
    }
    return [];
};
export const parseFullFilter = (filter, context, columns) => {
    const isAnd = "$and" in filter;
    const filters = isAnd ? filter.$and : filter.$or;
    const finalFilters = filters
        .map((f) => getFinalFilter(f, context, { columns }))
        .filter(isDefined);
    const f = isAnd ? { $and: finalFilters } : { $or: finalFilters };
    return f;
};
export const parseCheckForcedFilters = (rule, context, columns) => {
    let parsedRuleFilters;
    if (isObject(rule)) {
        if ("forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
            const forcedFilter = parseFullFilter(rule.forcedFilterDetailed, context, columns);
            if (forcedFilter) {
                parsedRuleFilters !== null && parsedRuleFilters !== void 0 ? parsedRuleFilters : (parsedRuleFilters = {});
                parsedRuleFilters.forcedFilter = forcedFilter;
            }
        }
        if ("checkFilterDetailed" in rule && rule.checkFilterDetailed) {
            const checkFilter = parseFullFilter(rule.checkFilterDetailed, context, columns);
            if (checkFilter) {
                parsedRuleFilters !== null && parsedRuleFilters !== void 0 ? parsedRuleFilters : (parsedRuleFilters = {});
                parsedRuleFilters.checkFilter = checkFilter;
            }
        }
    }
    return parsedRuleFilters;
};
const getValidatedFieldFilter = (value, columns, expectAtLeastOne = true) => {
    if (value === "*")
        return value;
    const values = Object.values(value);
    const keys = Object.keys(value);
    if (!keys.length && expectAtLeastOne)
        throw new Error("Must select at least a field");
    if (values.some((v) => v) && values.some((v) => !v)) {
        throw new Error("Invalid field filter: must have only include or exclude. Cannot have both");
    }
    if (!values.every((v) => [0, 1, true, false].includes(v))) {
        throw new Error("Invalid field filter: field values can only be one of 0,1,true,false");
    }
    const badCols = keys.filter((c) => !columns.includes(c));
    if (badCols.length) {
        throw new Error(`Invalid columns provided: ${badCols}`);
    }
    return value;
};
const parseForcedData = (value, context, columns) => {
    var _a;
    /** TODO: retire forced data completely */
    if (!((_a = value === null || value === void 0 ? void 0 : value.forcedDataDetail) === null || _a === void 0 ? void 0 : _a.length)) {
        if (value === null || value === void 0 ? void 0 : value.checkFilterDetailed) {
            const checkFilter = value === null || value === void 0 ? void 0 : value.checkFilterDetailed;
            if ("$and" in checkFilter && checkFilter.$and.length) {
                const forcedContextData = checkFilter.$and
                    .map((f) => {
                    var _a;
                    if (f.type !== "=")
                        return undefined;
                    if (f.contextValue && ((_a = f.contextValue) === null || _a === void 0 ? void 0 : _a.objectName) === "user") {
                        const userKey = f.contextValue.objectPropertyName;
                        if (!(userKey in context.user))
                            throw new Error(`Invalid objectPropertyName (${f.contextValue.objectPropertyName}) found in forcedData`);
                        return [f.fieldName, context.user[userKey]];
                    }
                    else if (f.value !== undefined) {
                        return [f.fieldName, f.value];
                    }
                    return undefined;
                })
                    .filter(isDefined);
                if (!forcedContextData.length)
                    return undefined;
                const forcedData = Object.fromEntries(forcedContextData);
                return {
                    forcedData,
                };
            }
        }
        return undefined;
    }
    let forcedData = {};
    value === null || value === void 0 ? void 0 : value.forcedDataDetail.forEach((v) => {
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
    return Object.assign(Object.assign(Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseCheckForcedFilters(rule, context, columns)), (rule.orderByFields && {
        orderByFields: getValidatedFieldFilter(rule.orderByFields, columns, false),
    })), (rule.filterFields && {
        filterFields: getValidatedFieldFilter(rule.filterFields, columns, false),
    }));
};
const parseUpdate = (rule, columns, context) => {
    var _a;
    if (!rule || rule === true)
        return rule;
    return Object.assign(Object.assign(Object.assign(Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseCheckForcedFilters(rule, context, columns)), parseForcedData(rule, context, columns)), (rule.filterFields && {
        filterFields: getValidatedFieldFilter(rule.filterFields, columns, false),
    })), (((_a = rule.dynamicFields) === null || _a === void 0 ? void 0 : _a.length) && {
        dynamicFields: rule.dynamicFields.map((v) => ({
            fields: getValidatedFieldFilter(v.fields, columns),
            filter: parseFullFilter(v.filterDetailed, context, columns),
        })),
    }));
};
const parseInsert = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return Object.assign(Object.assign({ fields: getValidatedFieldFilter(rule.fields, columns) }, parseForcedData(rule, context, columns)), parseCheckForcedFilters(rule, context, columns));
};
const parseDelete = (rule, columns, context) => {
    if (!rule || rule === true)
        return rule;
    return Object.assign(Object.assign({}, parseCheckForcedFilters(rule, context, columns)), { filterFields: getValidatedFieldFilter(rule.filterFields, columns) });
};
export const parseTableRules = (rules, isView = false, columns, context) => {
    if ([true, "*"].includes(rules)) {
        return true;
    }
    if (isObject(rules)) {
        return Object.assign({ select: parseSelect(rules.select, columns, context), subscribe: isObject(rules.select) ? rules.select.subscribe : rules.subscribe }, (!isView ?
            {
                insert: parseInsert(rules.insert, columns, context),
                update: parseUpdate(rules.update, columns, context),
                delete: parseDelete(rules.delete, columns, context),
                sync: rules.sync,
            }
            : {}));
    }
    return false;
};
export const getTableRulesErrors = async (rules, tableColumns, contextData) => {
    let result = {};
    await Promise.all(Object.keys(rules).map(async (ruleKey) => {
        const key = ruleKey;
        const rule = rules[key];
        try {
            parseTableRules({ [key]: rule }, false, tableColumns, contextData);
        }
        catch (err) {
            result[key] = err;
        }
    }));
    return result;
};
export const validateDynamicFields = async (dynamicFields, db, context, columns) => {
    var _a, e_1, _b, _c, _d, e_2, _e, _f;
    if (!dynamicFields)
        return {};
    try {
        for (var _g = true, _h = __asyncValues(dynamicFields.entries()), _j; _j = await _h.next(), _a = _j.done, !_a; _g = true) {
            _c = _j.value;
            _g = false;
            const [dfIndex, dfRule] = _c;
            const filter = await parseFullFilter(dfRule.filterDetailed, context, columns);
            if (!filter)
                throw new Error("dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule));
            await db.find(filter, { limit: 0 });
            try {
                /** Ensure dynamicFields filters do not overlap */
                for (var _k = true, _l = (e_2 = void 0, __asyncValues(dynamicFields.entries())), _m; _m = await _l.next(), _d = _m.done, !_d; _k = true) {
                    _f = _m.value;
                    _k = false;
                    const [_dfIndex, _dfRule] = _f;
                    if (dfIndex !== _dfIndex) {
                        const _filter = await parseFullFilter(_dfRule.filterDetailed, context, columns);
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
                    if (!_k && !_d && (_e = _l.return)) await _e.call(_l);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_g && !_a && (_b = _h.return)) await _b.call(_h);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return {};
};
export const getCIDRRangesQuery = (arg) => 'select \
  host(${cidr}::cidr) AS "from",  \
  host(broadcast(${cidr}::cidr)) AS "to" ';
