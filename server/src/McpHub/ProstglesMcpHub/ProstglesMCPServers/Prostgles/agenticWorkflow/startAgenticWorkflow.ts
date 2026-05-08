import type { DBSSchema } from "@common/publishUtils";
import { createWorkflowExecutionHandlers } from "./proxyHandlers/createWorkflowExecutionHandlers";
import type { DBS } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/getServerFunctions";
import { getSerialisableError, omitKeys } from "prostgles-types";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";
import type { AuthClientRequest } from "prostgles-server";
import { KeyObjMap } from "@common/KeyObjMap";
import { tout } from "@src/utils/tout";

const abortersByUserId = new KeyObjMap<
  { userId: string; chatId: number; messageId: string },
  AbortController
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
  const aborter = abortersByUserId.get({ userId, chatId, messageId });
  if (aborter) {
    aborter.abort();
    abortersByUserId.delete({ userId, chatId, messageId });
  }
  await tout(2e3);
  await dbs.agentic_workflow_runs.update(
    {
      chat_id: chatId,
      message_id: messageId,
      state: { "@>": { status: "running" } },
    },
    {
      state: {
        status: "stopped",
      },
      finished: new Date(),
    },
    {
      returning: { id: 1 },
    },
  );

  return { success: true };
};

export const startAgenticWorkflow = async ({
  workflow,
  user,
  dbs,
  chat,
  messageId,
  clientReq,
  executionMode,
  userInputValue,
  connection_id,
  autoApproveAllTools,
}: {
  workflow: DBSSchema["agentic_workflows"];
  user: DBSSchema["users"];
  dbs: DBS;
  chat: DBSSchema["llm_chats"];
  messageId: string;
  clientReq: AuthClientRequest;
  executionMode: "parallel" | "series";
  autoApproveAllTools: boolean;
  userInputValue: Record<string, unknown>;
  connection_id: string;
}) => {
  const { name, definition_data, definition_override } = workflow;
  const containerConfigurationWithOverrides = {
    ...definition_data.containerConfiguration,
    ...definition_override?.containerConfiguration,
  };
  const { agentDefinitions, orchestrationTools, userInput } = definition_data;
  const databaseAccessDefinitions =
    definition_override?.databaseAccessDefinitions ??
    definition_data.databaseAccessDefinitions;
  const aborter = new AbortController();
  const { agentHandlers, orchestratorChat } =
    await createWorkflowExecutionHandlers(
      {
        name,
        containerConfiguration: containerConfigurationWithOverrides,
        agentDefinitions,
        databaseAccessDefinitions,
        signal: aborter.signal,
        orchestrationTools,
        definition_override: workflow.definition_override,
        mode: "full",
        message_id: messageId,
        userInput,
      },
      {
        chatId: workflow.chat_id,
        dbs,
        userId: user.id,
        connectionId: connection_id,
        clientReq,
      },
      { runInSequence: executionMode !== "parallel", autoApproveAllTools },
    );

  if (
    databaseAccessDefinitions?.mode === "custom" &&
    databaseAccessDefinitions.ddlStatements
  ) {
    try {
      await runConnectionQuery(
        connection_id,
        databaseAccessDefinitions.ddlStatements,
      );
    } catch (error) {
      return {
        state: "init-error" as const,
        message: `Error creating tables from ddlStatements`,
        error: getSerialisableError(error),
      };
    }
  }

  abortersByUserId.set(
    { userId: user.id, chatId: chat.id, messageId },
    aborter,
  );
  const res = await startAgenticWorkflowContainer(
    dbs,
    {
      user_id: user.id,
      workflow_function_definition: workflow.definition,
      package_dependencies: workflow.package_dependencies ?? undefined,
      chat,
      abortSignal: aborter.signal,
      connection_id,
      messageId,
    },
    {
      type: "full",
      userInputValue,
      workflowId: workflow.id,
      workflow,
      orchestratorChat: orchestratorChat!,
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
            omitKeys(databaseAccessDefinitions, ["ddlStatements"])
          : (databaseAccessDefinitions ?? null),
      },
      executionMode,
      handler: (data, { timestamp }) => {
        const agentHandler = agentHandlers.get(data.agentName);
        if (!agentHandler) {
          throw `Agent handler for ${data.agentName} not found`;
        }
        return agentHandler(data.input, timestamp);
      },
    },
  ).catch((error: unknown) => {
    return {
      state: "init-error" as const,
      message: "Failed to start agentic workflow",
      error: getSerialisableError(error),
    };
  });

  return res;
};
