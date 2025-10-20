import type { SQLHandler } from "prostgles-types";
import { asName, includes, tryCatchV2 } from "prostgles-types";
import type { ColType } from "../../../../../../common/utils";

const isQueryValid = async (rawQuery: string, sql: SQLHandler) => {
  const queryWithSemicolon = getSQLQuerySemicolon(rawQuery, true);
  const res = await sql(
    `
      EXPLAIN
      ${queryWithSemicolon}
      `,
    {},
    { returnType: "default-with-rollback" },
  ).catch((_e) => false);
  return { isValid: Boolean(res), queryWithSemicolon };
};

/**
 * Get statement return type ensuring any dangerous commands are not commited
 */
const getQueryReturnType = async (
  rawQuery: string,
  sql: SQLHandler,
  includeTableOid = false,
): Promise<ColType[]> => {
  /** Check if it's a data returning statement to avoid useless error logs */
  const { queryWithSemicolon, isValid } = await isQueryValid(rawQuery, sql);

  if (!isValid) {
    return [];
  }
  if (includeTableOid) {
    const colTypes = await getTableExpressionReturnTypeWithTableOIDs(
      rawQuery,
      sql,
    );
    return colTypes;
  }

  const viewName = "prostgles_temp_view_getQueryReturnType" + Date.now();
  const result = await sql(
    `
      CREATE OR REPLACE TEMP VIEW "${viewName}" AS 
      ${queryWithSemicolon}

      SELECT
        column_name,
        format('%I', column_name) as escaped_column_name,
        data_type, 
        udt_name, 
        current_schema() as schema
      FROM information_schema.columns c 
      WHERE c.table_name = '${viewName}'
      
    `,
    {},
    { returnType: "default-with-rollback" },
  );

  return result.rows as ColType[];
};

/**
 * Does not fail on duplicate columns
 */
const getTableExpressionReturnTypeWithTableOIDs = async (
  query: string,
  sql: SQLHandler,
): Promise<ColType[]> => {
  const queryWithoutSemicolon = getSQLQuerySemicolon(query, false);
  const result = await sql(
    `
      ${queryWithoutSemicolon}
      LIMIT 0;
    `,
    {},
    { returnType: "default-with-rollback" },
  );

  const cols: ColType[] = result.fields.map((f) => {
    return {
      table_oid: f.tableID,
      column_name: f.name,
      escaped_column_name:
        /^[a-z_][a-z0-9_$]*$/.test(f.name) ? f.name : asName(f.name),
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
  includeTableOid = false,
): Promise<ExpressionResult> => {
  const cachedValue = cached.get(expression);
  if (cachedValue) {
    return cachedValue;
  }

  try {
    const result = await tryCatchV2(async () => {
      const colTypes = await getQueryReturnType(
        expression,
        sql,
        includeTableOid,
      );
      return { colTypes };
    });
    let colTypes = result.data?.colTypes;
    const { error } = result;
    if (!colTypes) {
      if (includes(["42701", "42P16"], (error as any)?.code)) {
        colTypes = await getTableExpressionReturnTypeWithTableOIDs(
          expression,
          sql,
        );
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

export const getSQLQuerySemicolon = (
  rawQuery: string,
  shouldEndWithSemicolon: boolean,
) => {
  const queryWithoutComments = removePostgresComments(rawQuery).trim();
  const endsWithSemicolon = queryWithoutComments.endsWith(";");

  if (shouldEndWithSemicolon) {
    return endsWithSemicolon ? rawQuery : rawQuery + "\n;";
  }
  return endsWithSemicolon ? queryWithoutComments.slice(0, -1) : rawQuery;
};

/**
 * Removes PostgreSQL comments from SQL code while preserving string literals
 * Handles:
 * - Single-line comments (-- comment)
 * - Multi-line block comments (\/* comment *\/)
 * - Nested block comments
 * - Comments inside string literals (preserved)
 */
const removePostgresComments = (sql: string) => {
  let result = "";
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Handle string literals (single quotes)
    if (char === "'") {
      result += char;
      i++;
      // Continue until closing quote, handling escaped quotes
      while (i < sql.length) {
        result += sql[i];
        if (sql[i] === "'" && sql[i - 1] !== "\\") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Handle string literals (double quotes - identifiers in PostgreSQL)
    if (char === '"') {
      result += char;
      i++;
      while (i < sql.length) {
        result += sql[i];
        if (sql[i] === '"' && sql[i - 1] !== "\\") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Handle single-line comments (--)
    if (char === "-" && nextChar === "-") {
      i += 2;
      // Skip until end of line
      while (i < sql.length && sql[i] !== "\n") {
        i++;
      }
      // Keep the newline
      if (i < sql.length && sql[i] === "\n") {
        result += "\n";
        i++;
      }
      continue;
    }

    // Handle multi-line block comments (/* ... */)
    if (char === "/" && nextChar === "*") {
      i += 2;
      let depth = 1;

      // Handle nested comments (PostgreSQL supports nested /* */ comments)
      while (i < sql.length && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }

    // Regular character
    result += char;
    i++;
  }

  return result;
};
