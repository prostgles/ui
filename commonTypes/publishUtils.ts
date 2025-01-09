import { DBGeneratedSchema } from "./DBGeneratedSchema";
import {
  GroupedDetailedFilter,
  getFinalFilter,
  isDefined,
  SimpleFilter,
} from "./filterUtils";

export type CustomTableRules = {
  type: "Custom";
  customTables: ({
    tableName: string;
  } & TableRules)[];
};

const OBJ_DEF_TYPES = [
  "boolean",
  "string",
  "number",
  "Date",
  "string[]",
  "number[]",
  "Date[]",
  "boolean[]",
] as const;
type DataTypes = (typeof OBJ_DEF_TYPES)[number];

type ArgObjDef = {
  type: DataTypes;
  allowedValues?: readonly string[] | readonly number[] | readonly Date[];
  defaultValue?: string;
  optional?: boolean;
  label?: string;

  /**
   * These can only be used on client side
   * */
  referencesFormatColumnContext?: {
    columnFilter: AnyObject;
  };
  references?: {
    table: string;
    column: string;
    /**
     * If true then the argument will represent the entire row and
     *  the specified column will only be used to display the chosen row
     */
    isFullRow?: boolean;

    /**
     * If true and isFullRow=true then a button will be shown
     *  in the row edit card to display this action
     */
    showInRowCard?: {
      actionLabel?: string;
    };
  };
};

type _ObjDef = DataTypes | ArgObjDef;

type ObjDef = _ObjDef | { oneOf: readonly _ObjDef[] } | { arrayOf: _ObjDef };

// type ObjDefObj =
// | ArgObjDef
// | { oneOf: readonly ArgObjDef[]; }
// | { arrayOf: ArgObjDef; }

export type ArgDef = ArgObjDef & {
  name: string;
};
export type ParamDef = ObjDef;

export type UXParamDefinition =
  | {
      param: Record<string, ArgDef>;
      paramOneOf?: undefined;
    }
  | {
      param?: undefined;
      paramOneOf: Record<string, ArgDef>[];
    };

export type MethodClientDef = {
  name: string;
  func: string;
  args: ArgDef[];
  outputTable?: string;
};

export type ContextValue = {
  objectName: string;
  objectPropertyName: string;
};

export type ForcedData =
  | {
      type: "fixed";
      fieldName: string;
      value: any;
    }
  | ({
      type: "context";
      fieldName: string;
    } & ContextValue);

export type SelectRule = {
  subscribe?: {
    throttle?: number;
  };
  fields: FieldFilter;
  forcedFilterDetailed?: GroupedDetailedFilter;
  filterFields?: FieldFilter;
  orderByFields?: FieldFilter;
};
export type UpdateRule = {
  fields: FieldFilter;
  forcedFilterDetailed?: GroupedDetailedFilter;
  filterFields?: FieldFilter;
  forcedDataDetail?: ForcedData[];
  checkFilterDetailed?: GroupedDetailedFilter;

  dynamicFields?: {
    filterDetailed: GroupedDetailedFilter;
    fields: FieldFilter;
  }[];
  forcedDataFrom?: "InsertRule";
  checkFilterFrom?: "InsertRule";
  fieldsFrom?: "SelectRule" | "InsertRule";
  forcedFilterFrom?: "SelectRule" | "DeleteRule";
  filterFieldsFrom?: "SelectRule" | "DeleteRule";
};

export type InsertRule = {
  fields: FieldFilter;
  forcedDataDetail?: ForcedData[];
  checkFilterDetailed?: GroupedDetailedFilter;
  checkFilterFrom?: "UpdateRule";
  forcedDataFrom?: "InsertRule";
};
export type DeleteRule = {
  filterFields: FieldFilter;
  forcedFilterDetailed?: GroupedDetailedFilter;
  filterFieldsFrom?: "SelectRule" | "UpdateRule";
  forcedFilterFrom?: "SelectRule" | "UpdateRule";
};

export type DBSSchema = {
  [K in keyof DBGeneratedSchema]: Required<DBGeneratedSchema[K]["columns"]>;
};

export type SyncRule = {
  id_fields: string[];
  synced_field: string;
  allow_delete?: boolean;
  batch_size?: number;
  throttle?: number;
};

export type TableRules = {
  select?: boolean | SelectRule;
  update?: boolean | UpdateRule;
  insert?: boolean | InsertRule;
  delete?: boolean | DeleteRule;
  subscribe?:
    | boolean
    | {
        throttle?: number;
      };
  sync?: SyncRule;
};

export type BasicTablePermissions = Partial<
  Record<Exclude<keyof TableRules, "sync">, boolean>
>;

type AnyObject = Record<string, any>;

type PublishedResultUpdate = {
  fields: FieldFilter;

  dynamicFields?: {
    filter: { $and: AnyObject[] } | { $or: AnyObject[] } | AnyObject;
    fields: FieldFilter;
  }[];

  forcedFilter?: AnyObject;

  forcedData?: AnyObject;

  filterFields?: FieldFilter;

  returningFields?: FieldFilter;
};

type PublishedResult =
  | boolean
  | {
      select?:
        | boolean
        | {
            fields: FieldFilter;
            filterFields?: FieldFilter;
            forcedFilter?: AnyObject;
            orderByFields?: FieldFilter;
          };
      update?: boolean | PublishedResultUpdate;
      insert?:
        | boolean
        | {
            fields: FieldFilter;
            forcedData?: AnyObject;
          };
      delete?:
        | boolean
        | {
            filterFields: FieldFilter;
            forcedFilter?: AnyObject;
          };
      sync?: SyncRule;
      subscribe?:
        | boolean
        | {
            throttle?: number;
          };
    };

export function isObject<T extends Record<string, any>>(obj: any): obj is T {
  return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}

export type FieldFilter =
  | ""
  | "*"
  | string[]
  | Record<string, 1 | true>
  | Record<string, 0 | false>;

export const parseFieldFilter = (args: {
  columns: string[];
  fieldFilter: FieldFilter;
}): string[] => {
  const { columns, fieldFilter } = args;
  if (!fieldFilter) return [];
  else if (fieldFilter === "*") return columns.slice();
  else if (Array.isArray(fieldFilter)) {
    if (!fieldFilter.length) return [];

    return columns.filter((c) =>
      (fieldFilter as string[]).includes(c.toString()),
    );
  } else if (isObject(fieldFilter) && Object.keys(fieldFilter).length) {
    const fields = Object.keys(fieldFilter);
    const isExcept = !Object.values(fieldFilter)[0];
    return columns.filter((c) =>
      isExcept ? !fields.includes(c) : fields.includes(c),
    );
  }

  return [];
};

export const parseFullFilter = (
  filter: GroupedDetailedFilter,
  context: ContextDataObject | undefined,
  columns: string[] | undefined,
): { $and: AnyObject[] } | { $or: AnyObject[] } | undefined => {
  const isAnd = "$and" in filter;
  const filters = isAnd ? filter.$and : filter.$or;
  const finalFilters = (filters as SimpleFilter[])
    .map((f) => getFinalFilter(f, context, { columns }))
    .filter(isDefined);
  const f = isAnd ? { $and: finalFilters } : { $or: finalFilters };
  return f;
};

type ParsedFilter = { $and: AnyObject[] } | { $or: AnyObject[] };
type ParsedRuleFilters = {
  forcedFilter?: ParsedFilter;
  checkFilter?: ParsedFilter;
};
export const parseCheckForcedFilters = (
  rule: TableRules[keyof TableRules],
  context: ContextDataObject | undefined,
  columns: string[] | undefined,
): ParsedRuleFilters | undefined => {
  let parsedRuleFilters: ParsedRuleFilters | undefined;
  if (isObject(rule)) {
    if ("forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
      const forcedFilter = parseFullFilter(
        rule.forcedFilterDetailed,
        context,
        columns,
      );
      if (forcedFilter) {
        parsedRuleFilters ??= {};
        parsedRuleFilters.forcedFilter = forcedFilter;
      }
    }
    if ("checkFilterDetailed" in rule && rule.checkFilterDetailed) {
      const checkFilter = parseFullFilter(
        rule.checkFilterDetailed,
        context,
        columns,
      );
      if (checkFilter) {
        parsedRuleFilters ??= {};
        parsedRuleFilters.checkFilter = checkFilter;
      }
    }
  }
  return parsedRuleFilters;
};

const getValidatedFieldFilter = (
  value: FieldFilter,
  columns: string[],
  expectAtLeastOne = true,
): FieldFilter => {
  if (value === "*") return value;
  const values = Object.values(value);
  const keys = Object.keys(value);
  if (!keys.length && expectAtLeastOne)
    throw new Error("Must select at least a field");
  if (values.some((v) => v) && values.some((v) => !v)) {
    throw new Error(
      "Invalid field filter: must have only include or exclude. Cannot have both",
    );
  }
  if (!values.every((v) => [0, 1, true, false].includes(v))) {
    throw new Error(
      "Invalid field filter: field values can only be one of 0,1,true,false",
    );
  }
  const badCols = keys.filter((c) => !columns.includes(c));
  if (badCols.length) {
    throw new Error(`Invalid columns provided: ${badCols}`);
  }
  return value;
};

export type ContextDataObject = {
  user: DBSSchema["users"];
};

const parseForcedData = (
  value: Pick<UpdateRule, "forcedDataDetail" | "checkFilterDetailed">,
  context: ContextDataObject,
  columns: string[],
): { forcedData: AnyObject } | undefined => {
  /** TODO: retire forced data completely */
  if (!value?.forcedDataDetail?.length) {
    if (value?.checkFilterDetailed) {
      const checkFilter = value?.checkFilterDetailed;
      if ("$and" in checkFilter && checkFilter.$and.length) {
        const forcedContextData = (checkFilter.$and as SimpleFilter[])
          .map((f) => {
            if (f.type !== "=") return undefined;

            if (f.contextValue && f.contextValue?.objectName === "user") {
              const userKey = f.contextValue.objectPropertyName;
              if (!(userKey in context.user))
                throw new Error(
                  `Invalid objectPropertyName (${f.contextValue.objectPropertyName}) found in forcedData`,
                );
              return [f.fieldName, (context.user as any)[userKey]];
            } else if (f.value !== undefined) {
              return [f.fieldName, f.value];
            }

            return undefined;
          })
          .filter(isDefined);
        if (!forcedContextData.length) return undefined;
        const forcedData: AnyObject = Object.fromEntries(forcedContextData);
        return {
          forcedData,
        };
      }
    }
    return undefined;
  }
  let forcedData: AnyObject = {};
  value?.forcedDataDetail.forEach((v) => {
    if (!columns.includes(v.fieldName))
      new Error(`Invalid fieldName in forced data ${v.fieldName}`);
    if (v.fieldName in forcedData)
      throw new Error(
        `Duplicate forced data (${v.fieldName}) found in ${JSON.stringify(value)}`,
      );
    if (v.type === "fixed") {
      forcedData[v.fieldName] = v.value;
    } else {
      const obj: AnyObject = context[v.objectName as keyof ContextDataObject];
      if (!obj)
        throw new Error(`Missing objectName (${v.objectName}) in forcedData`);
      if (!(v.objectPropertyName in obj))
        throw new Error(
          `Invalid/missing objectPropertyName (${v.objectPropertyName}) found in forcedData`,
        );
      forcedData[v.fieldName] = obj[v.objectPropertyName];
    }
  });
  return { forcedData };
};

const parseSelect = (
  rule: undefined | boolean | SelectRule,
  columns: string[],
  context: ContextDataObject | undefined,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseCheckForcedFilters(rule, context, columns),
    ...(rule.orderByFields && {
      orderByFields: getValidatedFieldFilter(
        rule.orderByFields,
        columns,
        false,
      ),
    }),
    ...(rule.filterFields && {
      filterFields: getValidatedFieldFilter(rule.filterFields, columns, false),
    }),
  };
};
const parseUpdate = (
  rule: undefined | boolean | UpdateRule,
  columns: string[],
  context: ContextDataObject,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseCheckForcedFilters(rule, context, columns),
    ...parseForcedData(rule, context, columns),
    ...(rule.filterFields && {
      filterFields: getValidatedFieldFilter(rule.filterFields, columns, false),
    }),
    ...(rule.dynamicFields?.length && {
      dynamicFields: rule.dynamicFields.map((v) => ({
        fields: getValidatedFieldFilter(v.fields, columns),
        filter: parseFullFilter(v.filterDetailed, context, columns),
      })),
    }),
  } as PublishedResultUpdate;
};
const parseInsert = (
  rule: undefined | boolean | InsertRule,
  columns: string[],
  context: ContextDataObject,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseForcedData(rule, context, columns),
    ...parseCheckForcedFilters(rule, context, columns),
  };
};
const parseDelete = (
  rule: undefined | boolean | DeleteRule,
  columns: string[],
  context: ContextDataObject,
) => {
  if (!rule || rule === true) return rule;

  return {
    ...parseCheckForcedFilters(rule, context, columns),
    filterFields: getValidatedFieldFilter(rule.filterFields, columns),
  };
};

export const parseTableRules = (
  rules: TableRules,
  isView = false,
  columns: string[],
  context: ContextDataObject,
): PublishedResult | undefined => {
  if ([true, "*"].includes(rules as any)) {
    return true;
  }

  if (isObject(rules)) {
    return {
      select: parseSelect(rules.select, columns, context),
      subscribe:
        isObject(rules.select) ? rules.select.subscribe : rules.subscribe,
      ...(!isView ?
        {
          insert: parseInsert(rules.insert, columns, context),
          update: parseUpdate(rules.update, columns, context),
          delete: parseDelete(rules.delete, columns, context),
          sync: rules.sync,
        }
      : {}),
    };
  }

  return false;
};

export type TableRulesErrors = Partial<Record<keyof TableRules, any>> & {
  all?: string;
};

export const getTableRulesErrors = async (
  rules: TableRules,
  tableColumns: string[],
  contextData: ContextDataObject,
): Promise<TableRulesErrors> => {
  let result: TableRulesErrors = {};

  await Promise.all(
    Object.keys(rules).map(async (ruleKey) => {
      const key = ruleKey as keyof TableRules;
      const rule = rules[key];

      try {
        parseTableRules({ [key]: rule }, false, tableColumns, contextData);
      } catch (err) {
        result[key] = err;
      }
    }),
  );

  return result;
};

export const validateDynamicFields = async (
  dynamicFields: UpdateRule["dynamicFields"],
  db: { find: any; findOne: any },
  context: ContextDataObject,
  columns: string[],
): Promise<{ error?: any }> => {
  if (!dynamicFields) return {};

  for await (const [dfIndex, dfRule] of dynamicFields.entries()) {
    const filter = await parseFullFilter(
      dfRule.filterDetailed,
      context,
      columns,
    );
    if (!filter)
      throw new Error(
        "dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule),
      );
    await db.find(filter, { limit: 0 });

    /** Ensure dynamicFields filters do not overlap */
    for await (const [_dfIndex, _dfRule] of dynamicFields.entries()) {
      if (dfIndex !== _dfIndex) {
        const _filter = await parseFullFilter(
          _dfRule.filterDetailed,
          context,
          columns,
        );
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

export const getCIDRRangesQuery = (arg: {
  cidr: string;
  returns: ["from", "to"];
}) =>
  'select \
  host(${cidr}::cidr) AS "from",  \
  host(broadcast(${cidr}::cidr)) AS "to" ';
