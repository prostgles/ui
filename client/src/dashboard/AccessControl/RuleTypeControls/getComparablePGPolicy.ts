import {
  getFinalFilter,
  parseContextVal,
  type GroupedDetailedFilter,
  type SimpleFilter,
} from "../../../../../commonTypes/filterUtils";
import type { ForcedData } from "../../../../../commonTypes/publishUtils";
import type { SelectRuleControlProps } from "./SelectRuleControl";
type GetComparablePGPolicyArgs = Pick<
  SelectRuleControlProps,
  "table" | "userTypes" | "prgl"
> & {
  command: "SELECT" | "UPDATE" | "INSERT" | "DELETE" | undefined;
  forcedFilterDetailed: GroupedDetailedFilter | undefined;
  checkFilterDetailed: GroupedDetailedFilter | undefined;
  forcedDataDetail: ForcedData[] | undefined;
  excludeRLSStatement?: boolean;
};

export const getComparablePGPolicy = async ({
  forcedFilterDetailed,
  checkFilterDetailed,
  command,
  forcedDataDetail,
  userTypes,
  table,
  prgl,
  excludeRLSStatement,
}: GetComparablePGPolicyArgs) => {
  const columns = table.columns.map((c) => c.name);
  const getSingleFilterCondition = async (f: SimpleFilter) => {
    if ("contextValue" in f) {
      const col = table.columns.find((c) => c.name === f.fieldName);
      if (!col) return "";
      const contextVal: string = parseContextVal(f, undefined, {
        forInfoOnly: "pg",
      });
      return `${f.fieldName} ${f.type ?? "="} ${contextVal}::${col.udt_name}`;
    }
    const parsedFilter = getFinalFilter(f, undefined, { columns });
    try {
      const condition = (await prgl.db[table.name]?.find?.(parsedFilter, {
        returnType: "statement-where",
      })) as any as string;
      return condition.trim();
    } catch (err) {
      return "";
    }
  };
  const getFilterCondition = async (
    filter: GroupedDetailedFilter | undefined,
  ) => {
    if (!filter) return "";
    const isAnd = "$and" in filter;
    const filters = isAnd ? filter.$and : filter.$or;
    const conditions = await Promise.all(
      filters.map((f) => getSingleFilterCondition(f as SimpleFilter)),
    );
    return `${conditions.filter((v) => v).join(isAnd ? " AND " : " OR ")}`;
  };

  const indent = (str: string, depth = 1, tab = "  ") =>
    str
      .split("\n")
      .map((l) => `${tab.repeat(depth)}${l}`)
      .join("\n");

  const usingCondition = await getFilterCondition(forcedFilterDetailed);
  const checkCondition = await getFilterCondition(checkFilterDetailed);

  const finalAction = command ?? "ALL";
  const using =
    finalAction === "INSERT" ? "" : (
      `\nUSING (\n  COALESCE(prostgles.user('type') IN (${userTypes.map((ut) => `'${ut}'`)}), FALSE)${usingCondition ? `\n AND \n${indent(usingCondition)}` : ""} \n)`
    );

  const forcedDataChecks =
    !forcedDataDetail?.length ?
      undefined
    : forcedDataDetail.map((d, i) => {
        const col = table.columns.find((c) => c.name === d.fieldName);
        const value =
          d.type === "fixed" ?
            ["number", "boolean"].includes(col?.tsDataType as any) ?
              d.value
            : `'${d.value}'`
          : `prostgles.${d.objectName}('${d.objectPropertyName}')::${col?.udt_name}`;
        return `${i ? "" : "  "}${d.fieldName} = ${value}`;
      });

  const withCheck =
    forcedDataChecks || checkCondition ?
      [
        `\nWITH CHECK (`,
        (forcedDataChecks ?? [])
          .concat([checkCondition])
          .filter((v) => v)
          .map((v) => `  ${v}`)
          .join("AND \n"),
        `)`,
      ].join("\n")
    : "";

  const policyName = JSON.stringify(
    `prostgles_${table.name}_${finalAction}_${userTypes.sort().join("_")}`,
  );
  const tableName = JSON.stringify(table.name);
  let policy = [
    `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`,
    `CREATE POLICY ${policyName}`,
    `ON ${tableName}`,
    `FOR ${finalAction}`,
  ].join("\n");
  if (using) policy += using;
  if (withCheck) policy += withCheck;
  policy += ";\n";

  if (excludeRLSStatement) return policy;
  return (
    policy +
    [`ALTER TABLE ${tableName}`, `ENABLE ROW LEVEL SECURITY;`].join("\n")
  );
};

export const getTableEnableRLSStatement = (tableName: string) => {
  return `ALTER TABLE ${JSON.stringify(tableName)} ENABLE ROW LEVEL SECURITY;`;
};
