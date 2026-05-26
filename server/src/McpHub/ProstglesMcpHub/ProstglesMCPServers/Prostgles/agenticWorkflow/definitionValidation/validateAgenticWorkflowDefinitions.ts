import { type DBS } from "@src/index";
import type { AuthClientRequest } from "prostgles-server";
import { createWorkflowExecutionHandlers } from "../proxyHandlers/createWorkflowExecutionHandlers";
import type { ProxyCallDataDefinitions } from "../runtimeSdk/defineAgenticWorkflowHandlers.types";
import { validateDatabaseAccessDefinitions } from "./validateDatabaseAccessDefinitions";
import type { DBSSchema } from "@common/publishUtils";

export const validateAgenticWorkflowDefinitions = async (
  { definitions, usedTables }: ProxyCallDataDefinitions,
  {
    connection_id,
    dbs,
    chatId,
    clientReq,
    userId,
    messageId,
  }: {
    connection_id: string;
    dbs: DBS;
    chatId: number;
    clientReq: AuthClientRequest;
    userId: string;
    messageId: DBSSchema["llm_messages"]["id"];
  },
) => {
  if (!connection_id) {
    throw new Error("Chat is missing connection_id");
  }

  const { databaseAccessDefinitions, userInput } = definitions;

  const { tablesOrViews, tsSchema, parsedDdlStatements } =
    await validateDatabaseAccessDefinitions({
      databaseAccessDefinitions,
      usedTables,
      connection_id,
    });

  const ensureTablesExistInFutureSchema = (
    tablesToCheck: string[],
    errMsg: string,
  ) => {
    const invalidTables = tablesToCheck.filter(
      (tableName) => !tablesOrViews.some((tov) => tov.name === tableName),
    );
    if (invalidTables.length) {
      throw `${errMsg} the following table names do not match any new tables or existing tables: ${JSON.stringify(invalidTables)}`;
    }
  };

  ensureTablesExistInFutureSchema(
    usedTables,
    "Validation error for databaseHandler usage:",
  );

  Object.entries(userInput || {}).forEach(([inputName, inputDefinition]) => {
    if (
      inputDefinition.type === "table-filter" ||
      inputDefinition.type === "table-column" ||
      inputDefinition.type === "table-column-value" ||
      inputDefinition.type === "table-column-values"
    ) {
      const tableName = inputDefinition.tableName;
      ensureTablesExistInFutureSchema(
        [tableName],
        `Validation error for userInput definition ${inputName}:`,
      );
    }
  });

  const result = await createWorkflowExecutionHandlers(
    {
      ...definitions,
      definition_override: {},
      message_id: messageId,
      mode: "definitions-only",
    },
    {
      dbs,
      chatId,
      clientReq,
      connectionId: connection_id,
      userId,
    },
    {
      autoApproveAllTools: false,
      runInSequence: true,
    },
  );

  const newTables = tablesOrViews.filter((tov) => {
    return parsedDdlStatements?.some((stmt) => {
      return (
        (stmt.type === "create_table" || stmt.type === "create_view") &&
        tov.name === stmt.escapedTableName
      );
    });
  });

  return { ...result, tsSchema, newTables };
};
