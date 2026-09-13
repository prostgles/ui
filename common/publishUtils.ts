import { DBGeneratedSchema, type DBSchema } from "./DBGeneratedSchema";
import {
  GroupedDetailedFilter,
  getFinalFilter,
  isDefined,
  DetailedFilter,
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
  $prostglesContext: {
    objectName: string;
    objectPropertyName: string;
  };
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

export type DBSSchema = DBSchema;

export type DBSSchemaForInsert = {
  [K in keyof DBGeneratedSchema]: DBGeneratedSchema[K]["columns"];
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
  "" | "*" | string[] | Record<string, 1 | true> | Record<string, 0 | false>;

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
  columns: string[] | undefined,
): { $and: AnyObject[] } | { $or: AnyObject[] } | undefined => {
  const isAnd = "$and" in filter;
  const filters = isAnd ? filter.$and : filter.$or;
  const finalFilters = filters
    .map((f) => getFinalFilter(f, { columns }))
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
  columns: string[] | undefined,
): ParsedRuleFilters | undefined => {
  let parsedRuleFilters: ParsedRuleFilters | undefined;
  if (isObject(rule)) {
    if ("forcedFilterDetailed" in rule && rule.forcedFilterDetailed) {
      const forcedFilter = parseFullFilter(rule.forcedFilterDetailed, columns);
      if (forcedFilter) {
        parsedRuleFilters ??= {};
        parsedRuleFilters.forcedFilter = forcedFilter;
      }
    }
    if ("checkFilterDetailed" in rule && rule.checkFilterDetailed) {
      const checkFilter = parseFullFilter(rule.checkFilterDetailed, columns);
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
  columns: string[] | undefined,
  expectAtLeastOne = true,
): FieldFilter => {
  if (value === "*") return value;
  const fieldFilter =
    Array.isArray(value) ?
      Object.fromEntries(value.map((column) => [column, 1]))
    : value;
  const values = Object.values(fieldFilter);
  const keys = Object.keys(fieldFilter);
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

  if (columns) {
    const badCols = keys.filter((c) => !columns.includes(c));
    if (badCols.length) {
      throw new Error(`Invalid columns provided: ${badCols}`);
    }
  }
  return value;
};

export type ContextDataObject = {
  user: DBSSchema["users"];
};

const parseForcedData = ({
  forcedDataDetail,
  checkFilterDetailed,
}: Pick<UpdateRule, "forcedDataDetail" | "checkFilterDetailed">):
  { forcedData: AnyObject } | undefined => {
  /** TODO: retire forced data completely because checkFilter can cover the same use case by using '=' filters */
  if (!forcedDataDetail?.length) {
    if (checkFilterDetailed) {
      const checkFilter = checkFilterDetailed;
      if ("$and" in checkFilter && checkFilter.$and.length) {
        const forcedContextData = (checkFilter.$and as DetailedFilter[])
          .map((f) => {
            if (f.type !== "=") {
              return undefined;
            }

            if (f.contextValue) {
              return [f.fieldName, f.contextValue];
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
  forcedDataDetail.forEach((item) => {
    if (item.fieldName in forcedData) {
      throw new Error(
        `Duplicate forced data (${item.fieldName}) found in ${JSON.stringify(forcedDataDetail)}`,
      );
    }
    if (item.type === "fixed") {
      forcedData[item.fieldName] = item.value;
    } else {
      const { $prostglesContext } = item;
      forcedData[item.fieldName] = { $prostglesContext };
    }
  });
  return { forcedData };
};

const parseSelect = (
  rule: undefined | boolean | SelectRule,
  columns: string[] | undefined,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseCheckForcedFilters(rule, columns),
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
  columns: string[] | undefined,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseCheckForcedFilters(rule, columns),
    ...parseForcedData(rule),
    ...(rule.filterFields && {
      filterFields: getValidatedFieldFilter(rule.filterFields, columns, false),
    }),
    ...(rule.dynamicFields?.length && {
      dynamicFields: rule.dynamicFields.map((v) => ({
        fields: getValidatedFieldFilter(v.fields, columns),
        filter: parseFullFilter(v.filterDetailed, columns),
      })),
    }),
  } as PublishedResultUpdate;
};
const parseInsert = (
  rule: undefined | boolean | InsertRule,
  columns: string[] | undefined,
) => {
  if (!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseForcedData(rule),
    ...parseCheckForcedFilters(rule, columns),
  };
};
const parseDelete = (
  rule: undefined | boolean | DeleteRule,
  columns: string[] | undefined,
) => {
  if (!rule || rule === true) return rule;

  return {
    ...parseCheckForcedFilters(rule, columns),
    filterFields: getValidatedFieldFilter(rule.filterFields, columns),
  };
};

export const parseTableRules = (
  tableRules: TableRules | true | "*",
  columns: string[] | undefined,
): PublishedResult | undefined => {
  if (tableRules === "*" || tableRules === true) {
    return true;
  }

  if (isObject(tableRules)) {
    return {
      select: parseSelect(tableRules.select, columns),
      subscribe:
        isObject(tableRules.select) ?
          tableRules.select.subscribe
        : tableRules.subscribe,
      // ...(!isView ?
      insert: parseInsert(tableRules.insert, columns),
      update: parseUpdate(tableRules.update, columns),
      delete: parseDelete(tableRules.delete, columns),
      sync: tableRules.sync,
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
): Promise<TableRulesErrors> => {
  let result: TableRulesErrors = {};

  await Promise.all(
    Object.keys(rules).map(async (ruleKey) => {
      const key = ruleKey as keyof TableRules;
      const rule = rules[key];

      try {
        parseTableRules({ [key]: rule }, tableColumns);
      } catch (err) {
        result[key] = err;
      }
    }),
  );

  return result;
};

export const validateDynamicFields = async (
  dynamicFields: UpdateRule["dynamicFields"],
  tableHandler: { find?: any; findOne?: any } | undefined,
  context: ContextDataObject,
  columns: string[],
): Promise<{ error?: any }> => {
  if (!dynamicFields || !tableHandler) return {};

  for (const [dfIndex, dfRule] of dynamicFields.entries()) {
    const filter = await parseFullFilter(dfRule.filterDetailed, columns);
    if (!filter)
      throw new Error(
        "dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule),
      );
    await tableHandler.find(filter, { limit: 0 });

    /** Ensure dynamicFields filters do not overlap */
    for (const [_dfIndex, _dfRule] of dynamicFields.entries()) {
      if (dfIndex !== _dfIndex) {
        const _filter = await parseFullFilter(_dfRule.filterDetailed, columns);
        if (
          await tableHandler.findOne(
            { $and: [filter, _filter] },
            { select: "" },
          )
        ) {
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
