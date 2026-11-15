import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { runConnectionQuery } from "@src/serverFunctions/stateServerFunctions";
import { getSerialisableError, omitKeys } from "prostgles-types";
import { startAgenticWorkflowContainer } from "./execution/startAgenticWorkflowContainer";
import { createWorkflowExecutionHandlers } from "./proxyHandlers/createWorkflowExecutionHandlers";
import { validateUserInput } from "./definitionValidation/validateUserInput";

const runningWorkflows = new Map<
  number,
  { userId: string; aborter: AbortController }
>();

export const stopAgenticWorkflow = async ({
  dbs,
  runId,
  userId,
}: {
  dbs: DBS;
  runId: number;
  userId: string;
}) => {
  const run = await dbs.agentic_workflow_runs.findOne({
    id: runId,
    user_id: userId,
  });
  if (!run) throw new Error("Workflow run not found");
  const running = runningWorkflows.get(runId);
  if (running?.userId === userId) {
    running.aborter.abort();
  } else if (run.state.status === "running") {
    /* A server restart can leave a run without its in-memory controller. */
    await dbs.agentic_workflow_runs.update(
      { id: runId, user_id: userId, state: { "@>": { status: "running" } } },
      { state: { status: "stopped" }, finished: new Date() },
    );
  }
  return { success: true };
};

export const startAgenticWorkflow = async ({
  workflow,
  user,
  dbs,
  chat,
  messageId,
  executionMode,
  userInputValue,
  connection_id,
  autoApproveAllTools,
  signal,
  invocationId,
  relatedRecords,
}: {
  workflow: DBSSchema["agentic_workflows"];
  user: Pick<DBSSchema["users"], "id">;
  dbs: DBS;
  chat?: DBSSchema["llm_chats"];
  messageId?: string;
  executionMode: "parallel" | "series";
  autoApproveAllTools: boolean;
  userInputValue: Record<string, unknown>;
  connection_id: string;
  signal?: AbortSignal;
  invocationId?: string;
  relatedRecords?: DBSSchema["agentic_workflow_runs"]["related_records"];
}) => {
  signal?.throwIfAborted();
  const { name, definition_data, definition_override } = workflow;
  const containerConfiguration = {
    ...definition_data.containerConfiguration,
    ...definition_override?.containerConfiguration,
  };
  const { agentDefinitions, orchestrationTools, userInput } = definition_data;
  const databaseAccessDefinitions =
    definition_override?.databaseAccessDefinitions ??
    definition_data.databaseAccessDefinitions;
  const validatedInput =
    userInput && validateUserInput(userInputValue, userInput);
  if (validatedInput?.isValid === false) throw new Error(validatedInput.error);
  const workflowRun = await dbs.agentic_workflow_runs.insert(
    {
      workflow_id: workflow.id,
      user_id: user.id,
      invocation_id: invocationId,
      related_records: relatedRecords,
      definition: workflow.definition,
      user_input_value: validatedInput?.value ?? {},
      execution_mode: executionMode,
      state: { status: "running" },
      log: [],
    } satisfies DBSSchemaForInsert["agentic_workflow_runs"],
    { returning: "*" },
  );
  const aborter = new AbortController();
  const abort = () => aborter.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  runningWorkflows.set(workflowRun.id, { userId: user.id, aborter });
  try {
    aborter.signal.throwIfAborted();
    const { agentHandlers, orchestratorChat } =
      await createWorkflowExecutionHandlers(
        {
          name,
          containerConfiguration,
          agentDefinitions,
          databaseAccessDefinitions,
          signal: aborter.signal,
          orchestrationTools,
          definition_override,
          mode: "full",
          message_id: messageId,
          workflowRunId: workflowRun.id,
          userInput,
        },
        { chatId: chat?.id, dbs, userId: user.id, connectionId: connection_id },
        { runInSequence: executionMode !== "parallel", autoApproveAllTools },
      );
    if (!orchestratorChat)
      throw new Error("Workflow orchestrator was not created");
    if (
      databaseAccessDefinitions?.mode === "custom" &&
      databaseAccessDefinitions.ddlStatements
    ) {
      await runConnectionQuery(
        connection_id,
        databaseAccessDefinitions.ddlStatements,
      );
    }
    aborter.signal.throwIfAborted();
    const result = await startAgenticWorkflowContainer(
      dbs,
      {
        user_id: user.id,
        workflow_function_definition: workflow.definition,
        package_dependencies: workflow.package_dependencies ?? undefined,
        abortSignal: aborter.signal,
        connection_id,
      },
      {
        type: "full",
        userInputValue: workflowRun.user_input_value,
        workflowRun,
        workflow,
        orchestratorChat,
        messageId,
        definition: {
          name,
          containerConfiguration,
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
          if (!agentHandler)
            throw new Error(`Agent handler for ${data.agentName} not found`);
          return agentHandler(data.input, timestamp);
        },
      },
    );
    return { ...result, runId: workflowRun.id };
  } catch (error) {
    await dbs.agentic_workflow_runs.update(
      { id: workflowRun.id },
      {
        state: {
          status: aborter.signal.aborted ? "stopped" : "error",
          message: JSON.stringify(getSerialisableError(error)),
        },
        finished: new Date(),
      },
    );
    return {
      state: "init-error" as const,
      message: "Failed to start agentic workflow",
      error: getSerialisableError(error),
      runId: workflowRun.id,
    };
  } finally {
    signal?.removeEventListener("abort", abort);
    runningWorkflows.delete(workflowRun.id);
  }
};
