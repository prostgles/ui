import { connectionManager, type DBS } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import { createAgentHandlers } from "./createAgentHandlers";
import type { ProxyCallDataDefinitions } from "./defineAgenticWorkflow";
import type { AuthClientRequest } from "prostgles-server";

export const validateAgenticWorkflowDefinitions = async (
  { definitions, newTables, usedTables }: ProxyCallDataDefinitions,
  {
    connection_id,
    dbs,
    chatId,
    clientReq,
    userId,
  }: {
    connection_id: string;
    dbs: DBS;
    chatId: number;
    clientReq: AuthClientRequest;
    userId: string;
  },
) => {
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }
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
  const { databaseAccessDefinitions, userInput } = definitions;
  const existingTableNames = Object.keys(activeConnection.prgl.db).filter(
    (tableName) => tableName !== "tx",
  );

  const currentSchema = await runConnectionQuery<{ schema: string }>(
    connection_id,
    `SELECT current_schema() AS schema`,
  ).then((res) => res[0]!.schema);
  const newTableWithEscapedNames = await runConnectionQuery<{
    table_schema: string;
    table_name: string;
    full_table_name: string;
    is_clashing: boolean;
    ifNotExists?: boolean;
  }>(
    connection_id,
    `
      SELECT
        t.schema AS table_schema,
        t.name   AS table_name,
        t."ifNotExists",
        CASE
          WHEN current_schema() = t.schema
            THEN quote_ident(t.name)
          ELSE
            quote_ident(t.schema) || '.' || quote_ident(t.name)
        END AS full_table_name,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE  
            table_schema = t.schema 
            AND table_name = t.name 
        ) AS is_clashing
      FROM jsonb_to_recordset($1::jsonb)
        AS t(schema text, name text, "ifNotExists" boolean);
    `,
    [
      JSON.stringify(
        newTables.map((t) => ({
          ...t,
          schema: t.schema || currentSchema,
        })),
      ),
    ],
  );

  const clashingTables = newTableWithEscapedNames.filter(
    (t) => t.is_clashing && !t.ifNotExists,
  );
  if (clashingTables.length) {
    throw `Validation error for databaseAccessDefinitions.tableCreateStatements: \nthe following tables already exist: ${clashingTables
      .map(({ table_name, table_schema }) =>
        !table_schema ? table_name : `${table_schema}.${table_name}`,
      )
      .join(", ")}`;
  }

  const ensureTablesExistInFutureSchema = (
    tablesToCheck: string[],
    errMsg: string,
  ) => {
    const invalidTables = tablesToCheck.filter(
      (tableName) =>
        !existingTableNames.includes(tableName) &&
        !newTables.some(
          (nt) =>
            `${nt.schema || currentSchema}.${nt.name}` === tableName ||
            nt.name === tableName,
        ),
    );
    if (invalidTables.length) {
      throw `${errMsg} the following table names do not match any new tables or existing tables: ${JSON.stringify(invalidTables)}`;
    }
  };
  ensureTablesExistInFutureSchema(
    usedTables,
    "Validation error for databaseHandler usage:",
  );

  const permissionTables =
    databaseAccessDefinitions?.mode === "custom" ?
      Object.keys(databaseAccessDefinitions.tablePermissions)
    : undefined;

  if (permissionTables) {
    ensureTablesExistInFutureSchema(
      permissionTables,
      "Validation error for databaseAccessDefinitions.tablePermissions:",
    );

    usedTables.forEach((table) => {
      if (!permissionTables.includes(table)) {
        throw `Validation error for databaseAccessDefinitions.tablePermissions: the table "${table}" used in the workflow is not included in the tablePermissions`;
      }
    });
  }

  Object.entries(userInput || {}).forEach(([inputName, inputDefinition]) => {
    if (
      inputDefinition.type === "table-filter" ||
      inputDefinition.type === "table-column"
    ) {
      const tableName = inputDefinition.tableName;
      ensureTablesExistInFutureSchema(
        [tableName],
        `Validation error for userInput definition ${inputName}:`,
      );
    }
  });

  return await createAgentHandlers(
    { ...definitions, definition_override: {} },
    {
      dbs,
      chatId,
      clientReq,
      connectionId: connection_id,
      userId,
    },
  );
};
