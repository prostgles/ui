import { connectionManager } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import type { ProxyCallDataDefinitions } from "../runtimeSdk/defineAgenticWorkflowHandlers.types";
import { parseDDLStatements } from "./parseDDLStatements";
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
      throw "State DB connection not allowed for agentic workflows";
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
        const statements = await parseDDLStatements(ddlStatements);

        const currentSchema = await runConnectionQuery<{ schema: string }>(
          connection_id,
          `SELECT current_schema() AS schema`,
        ).then((res) => res[0]!.schema);

        const getEscapedName = (name: string, schema?: string) => {
          return !schema || schema === currentSchema ?
              name
            : [schema, name].map(quoteIdent).join(".");
        };

        const parsedDdlStatements = statements.map((s) => {
          return {
            ...s,
            escapedTableName: getEscapedName(s.tableName, s.schemaName),
          };
        });

        const futureSchema = await activeConnection.prgl.getTSSchema({
          ddlWithRollback: ddlStatements,
        });
        parsedDdlStatements.forEach((ps) => {
          if (!tablePermissions[ps.escapedTableName]) {
            throw new Error(
              `Table "${ps.escapedTableName}" from ddlStatements not found in tablePermissions: \n${JSON.stringify(ps.statementText)}`,
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
