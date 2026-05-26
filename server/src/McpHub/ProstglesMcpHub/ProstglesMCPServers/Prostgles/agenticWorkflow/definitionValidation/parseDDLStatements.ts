import { parse } from "@libpg-query/parser";

export const parseDDLStatements = async (ddlStatements: string) => {
  const { stmts } = await parse(ddlStatements);

  if (!stmts?.length) {
    throw new Error("Failed to parse DDL statements. No statements found.");
  }
  const result = stmts.map(({ stmt, stmt_len, stmt_location = 0 }) => {
    const positionInfo = `Could not parse statement at position ${stmt_location} with length ${stmt_len}: `;
    if (!stmt) {
      throw new Error(positionInfo + "Statement is undefined.");
    }

    if (!stmt_len) {
      throw new Error(
        positionInfo + "Statement length or location is missing.",
      );
    }

    const statementText = ddlStatements.slice(
      stmt_location,
      stmt_location + stmt_len,
    );

    /** Only create table and create index allowed */
    if ("CreateStmt" in stmt) {
      if (!stmt.CreateStmt.tableElts?.length) {
        throw new Error(
          positionInfo + "CREATE TABLE statement has no columns defined.",
        );
      }
      const tableName = stmt.CreateStmt.relation?.relname;
      if (!tableName) {
        throw new Error(
          positionInfo + "CREATE TABLE statement is missing table name.",
        );
      }
      const schemaName = stmt.CreateStmt.relation?.schemaname;

      return {
        type: "create_table",
        tableName,
        schemaName,
        statementText,
      } as const;
    } else if ("IndexStmt" in stmt) {
      const tableName = stmt.IndexStmt.relation?.relname;
      if (!tableName) {
        throw new Error(
          positionInfo + "CREATE INDEX statement is missing table name.",
        );
      }
      const schemaName = stmt.IndexStmt.relation?.schemaname;
      return {
        type: "create_index",
        tableName,
        schemaName,
        statementText,
      } as const;
    } else if ("ViewStmt" in stmt) {
      const viewName = stmt.ViewStmt.view?.relname;
      if (!viewName) {
        throw new Error(
          positionInfo + "CREATE VIEW statement is missing view name.",
        );
      }
      const schemaName = stmt.ViewStmt.view?.schemaname;
      return {
        type: "create_view",
        tableName: viewName,
        schemaName,
        statementText,
      } as const;
    } else {
      throw new Error(
        positionInfo +
          `Only CREATE TABLE, CREATE VIEW and CREATE INDEX statements are allowed. Found statement of type: ${Object.keys(stmt)[0]}`,
      );
    }
  });

  return result;
};
