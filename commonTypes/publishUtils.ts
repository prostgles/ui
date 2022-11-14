import { DBSchemaGenerated } from "./DBoGenerated";
import { GroupedDetailedFilter, getFinalFilter, isDefined, SimpleFilter } from "./filterUtils";

export type CustomTableRules = {
  type: "Custom";
  customTables: ({
    tableName: string;
  } & TableRules)[];
}

export type UserGroupRule = DBSSchema["access_control"]["rule"]

export type ContextValue = {
  objectName: string;
  objectPropertyName: string;
}

export type ForcedData = ({
  type: "fixed";
  fieldName: string;
  value: any;
} | {
  type: "context";
  fieldName: string;
} & ContextValue);


export type SelectRule = {
  fields: FieldFilter,
  forcedFilterDetailed?: GroupedDetailedFilter;
  filterFields?: FieldFilter;
  orderByFields?: FieldFilter;
};
export type UpdateRule = {
  fields: FieldFilter;
  forcedFilterDetailed?: GroupedDetailedFilter;
  filterFields?: FieldFilter;
  forcedDataDetail?: ForcedData[];

  dynamicFields?: {
    filterDetailed: GroupedDetailedFilter;
    fields: FieldFilter;
  }[];
};

export type InsertRule = {
  fields: FieldFilter,
  forcedDataDetail?: ForcedData[];
}
export type DeleteRule = {
  filterFields: FieldFilter,
  forcedFilterDetailed?: GroupedDetailedFilter;
};

export type DBSSchema = {
  [K in keyof DBSchemaGenerated]: Required<DBSchemaGenerated[K]["columns"]>
}


export type TableRules = {
  select?: boolean | SelectRule;
  update?: boolean | UpdateRule;
  insert?: boolean | InsertRule;
  delete?: boolean | DeleteRule;
};

export type BasicTablePermissions = Partial<Record<keyof TableRules, boolean>>;

type AnyObject = Record<string, any>;

type PublishedResultUpdate = {
    
  fields: FieldFilter;

  dynamicFields?: {
    filter: { $and: AnyObject[]; } | { $or: AnyObject[]; } | AnyObject;
    fields: FieldFilter;
  }[];

  forcedFilter?: AnyObject;

  forcedData?: AnyObject;

  filterFields?: FieldFilter;

  returningFields?: FieldFilter;
};

type PublishedResult = boolean | {
  select?: boolean | {
    fields: FieldFilter;
    filterFields?: FieldFilter;
    forcedFilter?: AnyObject;
    orderByFields?: FieldFilter;
  };
  update?: boolean | PublishedResultUpdate;
  insert?: boolean | {
    fields: FieldFilter;
    forcedData?: AnyObject;
  };
  delete?: boolean | {
    filterFields: FieldFilter;
    forcedFilter?: AnyObject;
  }
}

export function isObject<T extends Record<string, any>>(obj: any): obj is T {
  return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}

export type FieldFilter = 
| "" 
| "*" 
| string[] 
| Record<string, 1 | true> 
| Record<string, 0 | false>;

export const parseFieldFilter = (args: { columns: string[]; fieldFilter: FieldFilter }): string[] => {
  const { columns, fieldFilter } = args;
  if(!fieldFilter) return [];
  else if(fieldFilter === "*") return columns.slice();
  else if(Array.isArray(fieldFilter)){
    if( !fieldFilter.length) return [];
    
    return columns.filter(c => (fieldFilter as string[]).includes(c.toString()));
  } else if(isObject(fieldFilter) && Object.keys(fieldFilter).length) {

    const fields = Object.keys(fieldFilter);
    const isExcept = !Object.values(fieldFilter)[0];
    return columns.filter(c => isExcept? !fields.includes(c) : fields.includes(c) )
  }

  return [];
}


export const parseFullFilter = (filter: GroupedDetailedFilter, context: ContextDataObject, columns: string[] | undefined): { $and: AnyObject[] } | { $or: AnyObject[] } | undefined => {
  const isAnd = "$and" in filter;
  const filters = isAnd? filter.$and : filter.$or;
  const finalFilters = (filters as SimpleFilter[]).map(f => getFinalFilter(f, context, { columns })).filter(isDefined);
  const f = isAnd? { $and: finalFilters } : { $or: finalFilters  };
  return f
}
 
export const parseForcedFilter = (rule: TableRules[keyof TableRules], context: ContextDataObject, columns: string[] | undefined): { forcedFilter: { $and: AnyObject[] } | { $or: AnyObject[] } } | undefined => {
  if(isObject(rule) && "forcedFilterDetailed" in rule && rule.forcedFilterDetailed){
    const forcedFilter = parseFullFilter(rule.forcedFilterDetailed, context, columns);
    if(forcedFilter) return { forcedFilter }
  }
  return undefined
}

const getValidatedFieldFilter = (value: FieldFilter, columns: string[], expectAtLeastOne = true): FieldFilter => {
  if(value === "*") return value;
  const values = Object.values(value);
  const keys = Object.keys(value);
  if(!keys.length && expectAtLeastOne) throw new Error("Must select at least a field");
  if(values.some(v => v) && values.some(v => !v)){
    throw new Error("Invalid field filter: must have only include or exclude. Cannot have both");
  }
  if(!values.every(v => [0,1,true,false].includes(v))){
    throw new Error("Invalid field filter: field values can only be one of 0,1,true,false");
  }
  const badCols = keys.filter(c => !columns.includes(c));
  if(badCols.length){
    throw new Error(`Invalid columns provided: ${badCols}`);
  }
  return value;
}

export type ContextDataObject = {
  user: DBSSchema["users"];
}

const parseForcedData = (value: { forcedDataDetail?: ForcedData[] }, context: ContextDataObject, columns: string[]) : { forcedData: AnyObject } | undefined => {
  if(!value?.forcedDataDetail) return undefined;
  let forcedData: AnyObject = {};
  value?.forcedDataDetail.forEach(v => {
    if(!columns.includes(v.fieldName)) new Error(`Invalid fieldName in forced data ${v.fieldName}`);
    if(v.fieldName in forcedData) throw new Error(`Duplicate forced data (${v.fieldName}) found in ${JSON.stringify(value)}`);
    if(v.type === "fixed"){
      forcedData[v.fieldName] = v.value;
    } else {
      const obj: AnyObject = context[v.objectName as keyof ContextDataObject];
      if(!obj) throw new Error(`Missing objectName (${v.objectName}) in forcedData`);
      if(!(v.objectPropertyName in obj)) throw new Error(`Invalid/missing objectPropertyName (${v.objectPropertyName}) found in forcedData`);
      forcedData[v.fieldName] = obj[v.objectPropertyName];
    }
  })
  return { forcedData };
}

const parseSelect = (rule: undefined | boolean | SelectRule, columns: string[], context: ContextDataObject) => {
  if(!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseForcedFilter(rule, context, columns),
    ...(rule.orderByFields && { orderByFields: getValidatedFieldFilter(rule.orderByFields, columns, false) }),
    ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) })
  }
}
const parseUpdate = (rule: undefined | boolean | UpdateRule, columns: string[], context: ContextDataObject) => {
  if(!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseForcedFilter(rule, context, columns),
    ...parseForcedData(rule, context, columns),
    ...(rule.filterFields && { filterFields: getValidatedFieldFilter(rule.filterFields, columns, false) }),
    ...(rule.dynamicFields?.length && { 
      dynamicFields: rule.dynamicFields.map(v => ({ 
        fields: getValidatedFieldFilter(v.fields, columns),
        filter: parseFullFilter(v.filterDetailed, context, columns)
      })) 
    })
  } as PublishedResultUpdate;
}
const parseInsert = (rule: undefined | boolean | InsertRule, columns: string[], context: ContextDataObject) => {
  if(!rule || rule === true) return rule;

  return {
    fields: getValidatedFieldFilter(rule.fields, columns),
    ...parseForcedData(rule, context, columns),
  }
}
const parseDelete = (rule: undefined | boolean | DeleteRule, columns: string[], context: ContextDataObject) => {
  if(!rule || rule === true) return rule;

  return {
    ...parseForcedFilter(rule, context, columns),
    filterFields: getValidatedFieldFilter(rule.filterFields, columns),
  }
}


export const parseTableRules = (rules: TableRules, isView = false, columns: string[], context: ContextDataObject): PublishedResult | undefined => {

  if(rules === true || rules === "*"){
    return true;
  } 
  
  if(isObject(rules)){
    return {
      select: parseSelect(rules.select, columns, context),
      ...(!isView? {
        insert: parseInsert(rules.insert, columns, context),
        update: parseUpdate(rules.update, columns, context),
        delete: parseDelete(rules.delete, columns, context),
      } : {})
    }
  }

  return false;
}

export type TableRulesErrors = Partial<Record<keyof TableRules, any>> & { all?: string; }

export const getTableRulesErrors = async (rules: TableRules, tableColumns: string[], contextData: ContextDataObject): Promise<TableRulesErrors> => {
  let result: TableRulesErrors = {};

  await Promise.all(Object.keys(rules).map(async ruleKey => {
    const key = ruleKey as keyof TableRules
    const rule = rules[key];

    try {
      parseTableRules({ [key]: rule }, false, tableColumns, contextData);
    } catch(err) {
      result[key] = err;
    }

  }));
  

  return result;
}


export const validateDynamicFields = async (dynamicFields: UpdateRule["dynamicFields"], db: { find: any; findOne: any; }, context: ContextDataObject, columns: string[]): Promise<{ error?: any }> => {

  if(!dynamicFields) return {}
                      
  for await(const [dfIndex, dfRule] of dynamicFields.entries() ){
    const filter = await parseFullFilter(dfRule.filterDetailed, context, columns);
    if(!filter) throw new Error("dynamicFields.filter cannot be empty: " + JSON.stringify(dfRule));
    await db.find(filter, { limit: 0 });

    /** Ensure dynamicFields filters do not overlap */
    for await(const [_dfIndex, _dfRule] of dynamicFields.entries() ){
      if(dfIndex !== _dfIndex){
        const _filter = await parseFullFilter(_dfRule.filterDetailed, context, columns);
        if(await db.findOne({ $and: [filter, _filter]}, { select: "" })){
          const error = `dynamicFields.filter cannot overlap each other. \n
          Overlapping dynamicFields rules:
              ${JSON.stringify(dfRule)} 
              AND
              ${JSON.stringify(_dfRule)} 
          `;
          return { error }
        }
      }
    }
  }
  
  return {};
}



export const getCIDRRangesQuery = (arg: { cidr: string; returns: ["from", "to"] }) => "select \
  host(${cidr}::cidr) AS \"from\",  \
  host(broadcast(${cidr}::cidr)) AS \"to\" ";