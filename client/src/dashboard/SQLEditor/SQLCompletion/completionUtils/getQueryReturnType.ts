import type { ColType } from "../../../../../../commonTypes/utils";
import type { SQLHandler } from "prostgles-types";
import { asName, tryCatch } from "prostgles-types";

/**
 * Get statement return type ensuring any dangerous commands are not commited
 */
const getQueryReturnType = async (
  query: string,
  sql: SQLHandler,
): Promise<ColType[]> => {
  /** Check if it's a data returning statement to avoid useless error logs */
  const res = await sql(
    `
      EXPLAIN
      ${query};      
    `,
    {},
    { returnType: "default-with-rollback" },
  ).catch((_e) => false);

  if (!res) {
    return [];
  }

  const viewName = "prostgles_temp_view_getQueryReturnType" + Date.now();
  const result = await sql(
    `
      CREATE OR REPLACE TEMP VIEW "${viewName}" AS 
      ${query};

      SELECT 
        --column_name, 
        column_name,
        format('%I', column_name) as escaped_column_name,
        data_type, 
        udt_name, 
        current_schema() as schema
      FROM information_schema.columns i 
      WHERE i.table_name = '${viewName}'
      
    `,
    {},
    { returnType: "default-with-rollback" },
  );

  return result.rows as ColType[];
};

/**
 * Does not fail on duplicate columns
 */
const getQueryReturnTypeForDuplicateCols = async (
  query: string,
  sql: SQLHandler,
): Promise<ColType[]> => {
  const result = await sql(
    `
      ${query}
      LIMIT 0;
    `,
    {},
    { returnType: "default-with-rollback" },
  );

  const cols: ColType[] = result.fields.map((f) => {
    return {
      column_name: f.name,
      escaped_column_name: asName(f.name),
      data_type: f.dataType,
      udt_name: f.dataType,
      schema: "public",
    };
  });
  return cols;
};

type ExpressionResult =
  | { colTypes: ColType[]; error?: undefined }
  | { colTypes?: undefined; error: any };
const cached = new Map<string, ExpressionResult>();

export const getTableExpressionReturnType = async (
  expression: string,
  sql: SQLHandler,
): Promise<ExpressionResult> => {
  const cachedValue = cached.get(expression);
  if (cachedValue) {
    return cachedValue;
  }

  try {
    const result = await tryCatch(async () => {
      const colTypes = await getQueryReturnType(expression, sql);
      return { colTypes };
    });
    let { colTypes } = result;
    const { error } = result;
    if (!colTypes) {
      if ((error as any)?.code === "42701") {
        colTypes = await getQueryReturnTypeForDuplicateCols(expression, sql);
      }
    }
    if (!colTypes) {
      console.warn(error);
      throw error ?? new Error("No columns found");
    }
    cached.set(expression, { colTypes });
    return { colTypes };
  } catch (error) {
    console.warn(error);
    cached.set(expression, { error });
    return {
      error,
    };
  }
};
