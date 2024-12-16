import type { SQLHandler } from "prostgles-types";
import type { CodeBlock } from "../SQLEditor/SQLCompletion/completionUtils/getCodeBlock";
import {
  isDateCol,
  isGeoCol,
  type ChartColumn,
  type ColInfo,
} from "../W_Table/TableMenu/getChartCols";
import { getTableExpressionReturnType } from "../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";

export type ChartableSQL = {
  /**
   * Full with statement IF all cte's are selects
   */
  withStatement: string;
  /**
   * Select statement used to create the chart
   * If with is defined then this should be the last select statement
   */
  sql: string;
  columns: ColInfo[];
  geoCols: ChartColumn[];
  dateCols: ChartColumn[];
  text: string;
};

export const getChartableSQL = async (
  {
    text,
    tokens,
    ftoken,
    blockStartOffset,
  }: Pick<CodeBlock, "text" | "tokens" | "blockStartOffset" | "ftoken">,
  sqlHandler: SQLHandler,
): Promise<ChartableSQL> => {
  const emptyResult = {
    text,
    withStatement: "",
    sql: "",
    dateCols: [],
    geoCols: [],
    columns: [],
  };

  const sql = cleanSql(text);
  const { dateCols, geoCols, columns } = await getChartColsFromSql(
    sql,
    sqlHandler,
  );
  if (ftoken?.textLC === "select") {
    return { text, withStatement: "", sql, dateCols, geoCols, columns };
  }

  /**
   * Exclude data modyfying statements
   */
  if (
    ftoken?.textLC !== "with" ||
    tokens.some((t) => t.textLC === "returning")
  ) {
    return emptyResult;
  }

  const firstSelectIndex = tokens.findIndex(
    (t) => !t.nestingId && t.textLC === "select",
  );
  const firstSelectToken = tokens[firstSelectIndex]!;
  const withStatement = text
    .slice(0, firstSelectToken.offset - blockStartOffset)
    .trim();
  const lastSelectStatement = cleanSql(
    text.slice(firstSelectToken.offset - blockStartOffset),
  );

  /** Check if correct */
  const newCols = await getChartColsFromSql(
    `
    ${withStatement}
    SELECT * 
    FROM (
      ${lastSelectStatement}
    ) prostgles_chartable_sql
  `,
    sqlHandler,
  );

  if (
    newCols.columns.length !== columns.length ||
    newCols.columns
      .map((c) => c.name + c.udt_name)
      .sort()
      .join() !==
      columns
        .map((c) => c.name + c.udt_name)
        .sort()
        .join()
  ) {
    return emptyResult;
  }

  return {
    text,
    withStatement,
    sql: lastSelectStatement,
    dateCols,
    geoCols,
    columns,
  };
};

const cleanSql = (text: string) => {
  let sql = text.trim();
  if (sql.endsWith(";")) sql = sql.slice(0, -1);
  return sql;
};

const getChartColsFromSql = async (sql: string, sqlHandler: SQLHandler) => {
  const trimmedSql = sql.trim();
  const { colTypes = [] } = await getTableExpressionReturnType(
    trimmedSql,
    sqlHandler,
  );
  const _allCols: ColInfo[] = colTypes.map((c) => ({
    ...c,
    name: c.column_name,
    udt_name: c.udt_name as any,
  }));
  const allCols: ChartColumn[] = _allCols.map((c) => ({
    ...c,
    type: "normal",
    otherColumns: _allCols.filter((c) => !isGeoCol(c) && !isDateCol(c)),
  }));

  return {
    sql: trimmedSql,
    geoCols: allCols.filter((c) => isGeoCol(c)),
    dateCols: allCols.filter((c) => isDateCol(c)),
    columns: allCols,
  };
};
