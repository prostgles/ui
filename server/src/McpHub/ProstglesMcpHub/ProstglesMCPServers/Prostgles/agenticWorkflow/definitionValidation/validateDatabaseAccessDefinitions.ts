import { connectionManager } from "@src/index";
import type { Statement } from "pgsql-ast-parser";
import { includes, isDefined, type TableSchema } from "prostgles-types";
import { ALLOWED_DDL_STATEMENT_TYPES } from "../runtimeSdk/defineAgenticWorkflow";
import type { ProxyCallDataDefinitions } from "../runtimeSdk/defineAgenticWorkflowHandlers.types";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import { quoteIdent } from "./quoteIdent";

export const validateDatabaseAccessDefinitions = async ({
  databaseAccessDefinitions,
  usedTables,
  connection_id,
}: {
  databaseAccessDefinitions: ProxyCallDataDefinitions["definitions"]["databaseAccessDefinitions"];
  usedTables: string[];
  connection_id: string;
}) => {
  const activeConnection =
    connectionManager.getActiveConnectionSilentFail(connection_id);
  if (!activeConnection) {
    if (
      connectionManager.connections?.find((c) => c.id === connection_id)
        ?.is_state_db
    ) {
      throw "State DB connection not allowed";
    }
    throw new Error("Connection not found for chat");
  }

  const result = await (async () => {
    if (databaseAccessDefinitions?.mode === "custom") {
      const { tablePermissions, ddlStatements } = databaseAccessDefinitions;

      if (typeof ddlStatements === "string") {
        if (!ddlStatements.trim()) {
          throw new Error("ddlStatements is an empty string");
        }
        const { parse } = await import("pgsql-ast-parser");
        const statements = parse(ddlStatements);
        const statementIsAllowed = (
          statement: Statement,
        ): statement is Extract<
          Statement,
          { type: (typeof ALLOWED_DDL_STATEMENT_TYPES)[number] }
        > => {
          return includes(ALLOWED_DDL_STATEMENT_TYPES, statement.type);
        };

        const currentSchema = await runConnectionQuery<{ schema: string }>(
          connection_id,
          `SELECT current_schema() AS schema`,
        ).then((res) => res[0]!.schema);

        const getEscapedName = (name: string, schema?: string) => {
          return !schema || schema === currentSchema ?
              name
            : [schema, name].map(quoteIdent).join(".");
        };

        const parsedDdlStatements = statements
          .map((statement) => {
            if (!statementIsAllowed(statement)) {
              throw new Error(
                `Only ${JSON.stringify(ALLOWED_DDL_STATEMENT_TYPES)} statements are allowed in ddlStatements`,
              );
            }
            if (statement.type === "create table") {
              const tableName = statement.name.name;
              const tableSchema = statement.name.schema;

              return {
                type: statement.type,
                escapedTableName: getEscapedName(tableName, tableSchema),
                tableName,
                tableSchema,
                statement,
              };
            }

            if (statement.type === "create view") {
              const viewName = statement.name.name;
              const viewSchema = statement.name.schema;

              return {
                type: statement.type,
                escapedTableName: getEscapedName(viewName, viewSchema),
                tableName: viewName,
                tableSchema: viewSchema,
                statement,
              };
            }

            const tableName = statement.table.name;
            const tableSchema = statement.table.schema;

            return {
              type: statement.type,
              escapedTableName: getEscapedName(tableName, tableSchema),
              tableName,
              tableSchema,
              statement,
            };
          })
          .filter(isDefined);

        const futureSchema = await activeConnection.prgl.getTSSchema({
          ddlWithRollback: ddlStatements,
        });
        parsedDdlStatements.forEach((ps) => {
          if (!tablePermissions[ps.escapedTableName]) {
            throw new Error(
              `Table "${ps.escapedTableName}" from ddlStatements not found in tablePermissions: \n${JSON.stringify(ps.statement)}`,
            );
          }
        });

        for (const tableName of Object.keys(tablePermissions)) {
          const matchingTable = futureSchema.tablesOrViews.find(
            (t) => t.name === tableName,
          );
          if (!matchingTable) {
            throw new Error(
              `Error validating tablePermissions: ${JSON.stringify(tableName)} does not match any new or existing tables.`,
            );
          }
        }

        return { ...futureSchema, parsedDdlStatements };
      }

      /**
       * Although the permissions are handled through getClientDBHandlersForChat we want to
       * give give better errors to the agent
       */
      usedTables.forEach((table) => {
        if (!tablePermissions[table]) {
          throw new Error(
            `Table "${table}" is used in the workflow but not included in tablePermissions`,
          );
        }
      });
    }
    const { tablesOrViews, tsSchema } = activeConnection.prgl.getTSSchema();
    return { tablesOrViews, tsSchema, parsedDdlStatements: undefined };
  })();

  return result;
};

// const newTableWithEscapedNames = await runConnectionQuery<{
//   table_schema: string;
//   table_name: string;
//   full_table_name: string;
//   is_clashing: boolean;
//   ifNotExists?: boolean;
// }>(
//   connection_id,
//   `
//     SELECT
//       t.schema AS table_schema,
//       t.name   AS table_name,
//       t."ifNotExists",
//       -- data type udt_name

//       CASE
//         WHEN current_schema() = t.schema
//           THEN quote_ident(t.name)
//         ELSE
//           quote_ident(t.schema) || '.' || quote_ident(t.name)
//       END AS full_table_name,
//       EXISTS (
//         SELECT 1
//         FROM information_schema.tables
//         WHERE
//           table_schema = t.schema
//           AND table_name = t.name
//       ) AS is_clashing
//     FROM jsonb_to_recordset($1::jsonb)
//       AS t(schema text, name text, "ifNotExists" boolean);
//   `,
//   [
//     JSON.stringify(
//       newTables.map((t) => ({
//         ...t,
//         schema: t.schema || currentSchema,
//       })),
//     ),
//   ],
// );

// const clashingTables = newTableWithEscapedNames.filter(
//   (t) => t.is_clashing && !t.ifNotExists,
// );
// if (clashingTables.length) {
//   throw `Validation error for databaseAccessDefinitions.ddlStatements: \nthe following tables already exist: ${clashingTables
//     .map(({ table_name, table_schema }) =>
//       !table_schema ? table_name : `${table_schema}.${table_name}`,
//     )
//     .join(", ")}`;
// }
