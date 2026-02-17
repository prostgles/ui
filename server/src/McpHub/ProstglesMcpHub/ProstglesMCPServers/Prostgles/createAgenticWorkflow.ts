import { connectionManager } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import { omitKeys } from "prostgles-types";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import { startAgenticWorkflowContainer } from "./startAgenticWorkflowContainer";

export const createAgenticWorkflow = async (
  { workflow_function_definition }: { workflow_function_definition: string },
  { user_id, chat, dbs }: McpCallContext,
) => {
  const { connection_id } = chat;
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }
  const activeConnection =
    connectionManager.getActiveConnectionSilentFail(connection_id);
  if (!activeConnection) {
    throw new Error("Connection not found for chat");
  }
  const tableNames = Object.keys(activeConnection.prgl.db).filter(
    (tableName) => tableName !== "tx",
  );
  const aborter = new AbortController();
  return new Promise((resolve, reject) => {
    startAgenticWorkflowContainer(
      dbs,
      {
        user_id,
        workflowTs: workflow_function_definition,
        chat_id: chat.id,
        abortSignal: aborter.signal,
      },
      {
        type: "definitions-only",
        handler: async ({ definitions, newTables, usedTables }) => {
          const definition_data = omitKeys(definitions, ["name"]);

          if (newTables.length) {
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
              reject(
                `Validation error for databaseAccessDefinitions.tableCreateStatements: \nthe following tables already exist: ${clashingTables
                  .map((t) => `${t.table_schema}.${t.table_name}`)
                  .join(", ")}`,
              );
              return;
            }
            const invalidTables = usedTables.filter(
              (usedTable) =>
                !tableNames.includes(usedTable) &&
                !newTables.some(
                  (nt) =>
                    `${nt.schema || currentSchema}.${nt.name}` === usedTable ||
                    nt.name === usedTable,
                ),
            );
            if (invalidTables.length) {
              reject(
                `Validation error for databaseHandler usage: the following table names do not match any new tables or existing tables: ${invalidTables.join(", ")}`,
              );
            }
          }
          dbs.agentic_workflows
            .insert(
              {
                user_id,
                name: definitions.name,
                chat_id: chat.id,
                definition_data: {
                  ...definition_data,
                  toolDefinitions: definition_data.toolDefinitions || {},
                },
              },
              { returning: { id: 1 } },
            )
            .then(({ id }) => {
              resolve({
                isValid: true,
                workflowId: id,
                ...definitions,
              });
            })
            .catch(reject);
        },
      },
    )
      .then((containerResult) => {
        if (containerResult.state !== "finished") {
          reject(containerResult.log.map((l) => l.text).join("\n"));
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
