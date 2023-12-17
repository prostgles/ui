import { mdiShieldLockOutline } from "@mdi/js";
import React from "react";
import { GroupedDetailedFilter } from "../../../../../commonTypes/filterUtils";
import { DeleteRule, ForcedData, InsertRule, SelectRule, UpdateRule, parseFieldFilter, parseFullFilter } from "../../../../../commonTypes/publishUtils";
import { Prgl } from "../../../App";
import { FlexCol } from "../../../components/Flex";
import { Label } from "../../../components/Label";
import CodeExample from "../../CodeExample";
import { usePromise } from "../../ProstglesMethod/hooks";
import { SelectRuleControlProps } from "./SelectRuleControl";

type P = Pick<SelectRuleControlProps, "table" | "userTypes" | "prgl" | "contextDataSchema"> & (
  | {
    rule: SelectRule;
    command: "SELECT"
  }
  | {
    rule: InsertRule;
    command: "INSERT"
  }
  | {
    rule: UpdateRule;
    command: "UPDATE"
  }
  | {
    rule: DeleteRule;
    command: "DELETE"
  }
);
export const ExampleComparablePolicy = ({ table, userTypes, rule, command, prgl, contextDataSchema }: P) => {

  const policy = usePromise(async () =>  command === "SELECT"? 
    getComparableSelectPolicy(rule, table, userTypes, prgl) : 
    getPGPolicy({ ...rule, prgl, table, userTypes, action: command }), 
    [getComparableSelectPolicy, getPGPolicy, table, userTypes, rule, command, prgl, contextDataSchema ]
  )

  return <FlexCol>
    <Label 
      iconPath={mdiShieldLockOutline} 
      label={"Comparable postgres policy"} 
      info={"Policy that may be used in postgres to replicate some of these rules"} 
      popupTitle={"Comparable postgres policy"} 
    />
    {policy && <FlexCol className="gap-p5 ml-3 p-1">
      <div className="text-gray-700 ai-start">Policy that may be used in postgres to replicate some of the rules above</div>
      <CodeExample 
        language="sql" 
        style={{ minWidth: "500px", minHeight: "200px" }}
        value={policy}
      />
    </FlexCol>}
    
  </FlexCol>
}


type getPGPolicyArgs = Pick<SelectRuleControlProps, "table" | "userTypes" | "prgl"> & {
  action?: "SELECT" | "UPDATE" | "INSERT" | "DELETE";
  forcedFilterDetailed?: GroupedDetailedFilter | undefined;
  checkFilterDetailed?: GroupedDetailedFilter | undefined;
  forcedDataDetail?: ForcedData[];
}

const getPGPolicy = async ({ forcedFilterDetailed, checkFilterDetailed, action, forcedDataDetail, userTypes, table, prgl }: getPGPolicyArgs) => {
  // let filter = getFinalFilterInfo(forcedFilterDetailed, undefined, undefined, { for: "pg" }).trim();
  // if(filter) filter = `(${filter})`;

  const getCondition = async (f: GroupedDetailedFilter | undefined) => {
    if(!f) return "";

    try {
      const condition = (await prgl.db[table.name]?.find?.(parseFullFilter(f, undefined, table.columns.map(c => c.name)), { returnType: "statement-where" })) as any as string;
      return (condition || "").trim()
    } catch(error){
      console.error(error);
    }
    return "";
  }

  const indent = (str: string, depth = 1, tab = "  ") => str.split("\n").map(l => `${tab.repeat(depth)}${l}`).join("\n");
  
  const usingCondition = await getCondition(forcedFilterDetailed);
  const checkCondition = await getCondition(checkFilterDetailed);

  const finalAction = action ?? "ALL"
  const using = finalAction === "INSERT"? 
    "" : 
    `\nUSING (\n  COALESCE(prostgles.user('type') IN (${userTypes.map(ut => `'${ut}'`)}), FALSE)${usingCondition? `\n AND \n${indent(usingCondition)}` : ""} \n)`;

  const forcedDataChecks = !forcedDataDetail?.length? undefined : forcedDataDetail.map((d, i)=> {
    const col = table.columns.find(c => c.name === d.fieldName);
    const value = d.type === "fixed"? 
      ( ["number", "boolean"].includes(col?.tsDataType as any)? d.value : `'${d.value}'` ) : 
      `prostgles.${d.objectName}('${d.objectPropertyName}')::${col?.udt_name}`
    return `${i? "" : "  "}${d.fieldName} = ${value}`;
  })

  const withCheck = (forcedDataChecks || checkCondition)? [
    `\nWITH CHECK (`,
      (forcedDataChecks ?? [])
        .concat([checkCondition])
        .filter(v => v)
        .map(v => `  ${v}`)
        .join("AND \n"),
    `)`
  ].join("\n") : ""

  let policy = [
    `CREATE POLICY ${JSON.stringify(`prostgles_${table.name}_${finalAction}_${userTypes.sort().join("_")}`)}`,
    `ON ${JSON.stringify(table.name)}`,
    `FOR ${finalAction}`,
  ].join("\n");
  if(using) policy += using;
  if(withCheck) policy += withCheck;
  policy += ";\n"
  return policy + [
    `ALTER TABLE ${JSON.stringify(table.name)}`, 
    `ENABLE ROW LEVEL SECURITY;`,
  ].join("\n");
}


const getComparableSelectPolicy = async (rule: SelectRule, table: P["table"], userTypes: string[], prgl: Prgl) => {
  let query = "";
  let viewName = "";
  if(rule.fields !== "*"){
    viewName = table.name + "_view";
    query += [
      `/** Comparable postgres view to limite select fields */`,
      `CREATE VIEW ${JSON.stringify(viewName)} AS`,
      `SELECT ${parseFieldFilter({ 
        fieldFilter: rule.fields, 
        columns: table.columns.map(c => c.name) 
      }).join(", ")}`,
      `FROM ${JSON.stringify(table.name)};`,
      `ALTER TABLE ${JSON.stringify(viewName)}`, 
      `ENABLE ROW LEVEL SECURITY;`,
      `\n\n`
    ].join("\n");
  }

  query += (await getPGPolicy({ 
    table: viewName? {
      ...table,
      name: viewName
    } : table, 
    action: "SELECT", 
    forcedFilterDetailed: rule.forcedFilterDetailed, 
    userTypes,
    prgl,
  }));

  return query;
}