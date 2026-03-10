import type { DBSSchema } from "@common/publishUtils";
import { createWorkflowProxyHandlers } from "./proxyHandlers/createWorkflowProxyHandlers";
import type { DBS } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import { getSerialisableError, omitKeys } from "prostgles-types";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";
import type { AuthClientRequest } from "prostgles-server";

const abortersByUserId = new Map<
  string,
  { chatId: number; messageId: string; aborter: AbortController }[]
>();

export const stopAgenticWorkflow = async ({
  dbs,
  chatId,
  messageId,
  userId,
}: {
  dbs: DBS;
  chatId: number;
  messageId: string;
  userId: string;
}) => {
  const userAborters = abortersByUserId.get(userId);
  const aborterEntryIndex = userAborters?.findIndex(
    (entry) => entry.chatId === chatId && entry.messageId === messageId,
  );
  const aborterEntry = userAborters?.[aborterEntryIndex ?? -1];
  if (aborterEntry) {
    aborterEntry.aborter.abort();
    userAborters.splice(aborterEntryIndex!, 1);
    abortersByUserId.set(userId, userAborters);
    return { success: true };
  } else {
    await dbs.agentic_workflow_runs.update(
      {
        chat_id: chatId,
        message_id: messageId,
        state: { status: "running" },
      },
      {
        state: {
          status: "stopped",
        },
        finished: new Date(),
      },
    );
    return { success: false, message: "No running workflow found" };
  }
};

export const startAgenticWorkflow = async ({
  workflow,
  user,
  dbs,
  chatId,
  messageId,
  clientReq,
  executionMode,
  userInputValue,
  connection_id,
}: {
  workflow: DBSSchema["agentic_workflows"];
  user: DBSSchema["users"];
  dbs: DBS;
  chatId: number;
  messageId: string;
  clientReq: AuthClientRequest;
  executionMode: "parallel" | "series";
  userInputValue: Record<string, unknown>;
  connection_id: string;
}) => {
  const { name, definition_data } = workflow;
  const containerConfigurationWithOverrides = {
    ...workflow.definition_data.containerConfiguration,
    ...workflow.definition_override?.containerConfiguration,
  };
  const {
    agentDefinitions,
    databaseAccessDefinitions,
    orchestrationTools,
    userInput,
  } = definition_data;
  const aborter = new AbortController();
  const { agentHandlers, orchestrationToolsHandler } =
    await createWorkflowProxyHandlers(
      {
        name,
        containerConfiguration: containerConfigurationWithOverrides,
        agentDefinitions,
        databaseAccessDefinitions,
        signal: aborter.signal,
        orchestrationTools,
        definition_override: workflow.definition_override,
      },
      {
        chatId: workflow.chat_id,
        dbs,
        userId: user.id,
        connectionId: connection_id,
        clientReq,
      },
      executionMode !== "parallel",
    );

  if (
    databaseAccessDefinitions?.mode === "custom" &&
    databaseAccessDefinitions.tableCreateStatements
  ) {
    try {
      await runConnectionQuery(
        connection_id,
        databaseAccessDefinitions.tableCreateStatements,
      );
    } catch (error) {
      return {
        state: "init-error" as const,
        message: `Error creating tables from tableCreateStatements`,
        error: getSerialisableError(error),
      };
    }
  }

  const existingAborters = abortersByUserId.get(user.id) || [];
  abortersByUserId.set(user.id, [
    ...existingAborters,
    { chatId, messageId, aborter },
  ]);
  const res = await startAgenticWorkflowContainer(
    dbs,
    {
      user_id: user.id,
      workflow_function_definition: workflow.definition,
      package_dependencies: workflow.package_dependencies ?? undefined,
      chat_id: chatId,
      abortSignal: aborter.signal,
      connection_id,
    },
    {
      type: "full",
      userInputValue,
      workflowId: workflow.id,
      workflow,
      messageId,
      definition: {
        name,
        containerConfiguration: containerConfigurationWithOverrides,
        agentDefinitions,
        userInput,
        databaseAccessDefinitions,
      },
      dbPermissions: {
        connection_id,
        db_data_permissions:
          databaseAccessDefinitions?.mode === "custom" ?
            omitKeys(databaseAccessDefinitions, ["tableCreateStatements"])
          : (databaseAccessDefinitions ?? null),
      },
      handler: (data, { httpReq, res }) => {
        if (data.type === "agent") {
          const agentHandler = agentHandlers.get(data.agentName);
          if (!agentHandler) {
            throw `Agent handler for ${data.agentName} not found`;
          }
          return agentHandler(data.input);
        }

        const toolHandler = orchestrationToolsHandler.get(data.name);
        if (!toolHandler) {
          throw `Tool handler for ${data.name} not found`;
        }
        return toolHandler(data.input, { httpReq, res });
      },
    },
  ).catch((error: unknown) => {
    return {
      state: "init-error" as const,
      message: "Failed to start agentic workflow",
      error,
    };
  });

  return res;
};
