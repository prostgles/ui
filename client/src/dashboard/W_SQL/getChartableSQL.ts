import type { PG_COLUMN_UDT_DATA_TYPE, SQLHandler } from "prostgles-types";
import type { CodeBlock } from "../SQLEditor/SQLCompletion/completionUtils/getCodeBlock";
import {
  isDateCol,
  isGeoCol,
  type ChartColumn,
  type ColInfo,
} from "../W_Table/TableMenu/getChartCols";
import { getTableExpressionReturnType } from "../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { colIs } from "../SmartForm/SmartFormField/fieldUtils";

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
  barCols: ChartColumn[];
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
  tables: DBSchemaTableWJoins[],
): Promise<ChartableSQL> => {
  const emptyResult = {
    text,
    withStatement: "",
    sql: "",
    dateCols: [],
    geoCols: [],
    barCols: [],
    columns: [],
  };

  const sql = cleanSql(text);
  const { dateCols, geoCols, barCols, columns } = await getChartColsFromSql(
    sql,
    sqlHandler,
    tables,
  );
  if (ftoken?.textLC === "select") {
    return {
      text,
      withStatement: "",
      sql,
      dateCols,
      barCols,
      geoCols,
      columns,
    };
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
    tables,
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
    barCols,
    columns,
  };
};

const cleanSql = (text: string) => {
  let sql = text.trim();
  if (sql.endsWith(";")) sql = sql.slice(0, -1);
  return sql;
};

const getChartColsFromSql = async (
  sql: string,
  sqlHandler: SQLHandler,
  tables: DBSchemaTableWJoins[],
) => {
  const trimmedSql = sql.trim();
  const { colTypes = [] } = await getTableExpressionReturnType(
    trimmedSql,
    sqlHandler,
    true,
  );
  const _allCols: ColInfo[] = colTypes.map((c) => ({
    ...c,
    name: c.column_name,
    is_pkey:
      Boolean(c.table_oid) &&
      tables.some(
        ({ info: { oid }, columns }) =>
          oid === c.table_oid &&
          columns.some((col) => col.is_pkey && col.name === c.column_name),
      ),
    udt_name: c.udt_name as PG_COLUMN_UDT_DATA_TYPE,
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
    barCols: allCols,
    columns: allCols,
  };
};
