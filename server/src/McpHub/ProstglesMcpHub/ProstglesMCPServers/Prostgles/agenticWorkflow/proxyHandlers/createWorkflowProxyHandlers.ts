import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";
import { tout } from "@src/utils/tout";
import type { AuthClientRequest } from "prostgles-server";
import type { DefineAgenticWorkflow } from "../runtimeSdk/defineAgenticWorkflow";
import { getAgentConfigWithDefaults } from "./getAgentConfigWithDefaults";
import { getOrchestrationToolsHandler } from "./getOrchestrationToolsHandler";
import { getValidatedMcpServerToolsAllowed } from "../definitionValidation/getValidatedMcpServerToolsAllowed";

/**
 * Execute agent invocations in series to reduce risk of avoid runaway costs and allow for human feedback between steps.
 */
let agentExecutionChain: Promise<void> = Promise.resolve();

const enqueueAgentExecution = <T>(
  agentExecution: () => Promise<T>,
): Promise<T> => {
  const executionPromise = agentExecutionChain.then(agentExecution);
  agentExecutionChain = executionPromise.catch((error) => {
    console.error("Error executing agent:", error);
  }) as Promise<void>;
  return executionPromise;
};

export const createWorkflowProxyHandlers = async <
  P extends DefineAgenticWorkflow,
>(
  {
    name,
    agentDefinitions,
    containerConfiguration,
    signal,
    definition_override,
    orchestrationTools,
  }: Parameters<P>[0] & {
    signal?: AbortSignal;
  } & Pick<DBSSchema["agentic_workflows"], "definition_override">,
  {
    dbs,
    chatId,
    userId,
    connectionId,
    clientReq,
  }: {
    dbs: DBS;
    chatId: number;
    userId: string;
    connectionId: string;
    clientReq: AuthClientRequest;
  },
  runInSequence = true,
) => {
  if (!statePrgl) {
    throw new Error("Prostgles state is not initialized");
  }
  const { clientMethods } = await statePrgl.getClientDBHandlers(clientReq, {
    methods: { askLLM: true },
  });
  const dbsClientFunctions = clientMethods as unknown as {
    [K in keyof GeneratedFunctionSchema]: {
      run: GeneratedFunctionSchema[K];
    };
  };
  const agentHandlers = new Map<string, (agentInput: string) => Promise<any>>();
  const started = Date.now();
  const user = await dbs.users.findOne({ id: userId });
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
  const { orchestrationToolsHandler } = await getOrchestrationToolsHandler({
    orchestrationTools,
    dbs,
    chatId,
    userId,
    connectionId,
  });

  const agentConfigsWithDefaults: Record<
    string,
    Awaited<ReturnType<typeof getAgentConfigWithDefaults>>
  > = {};
  for (const [agentName, config] of Object.entries(agentDefinitions ?? {})) {
    const configWithDefaults = await getAgentConfigWithDefaults(
      { agentName, agentConfig: config, definition_override },
      dbs,
    );

    agentConfigsWithDefaults[agentName] = configWithDefaults;

    const {
      model,
      prompt,
      outputSchema,
      tools,
      maxCostUSD,
      maxIterations,
      maxTokens,
      temperature,
    } = configWithDefaults;

    const toolsWithInfo =
      tools && (await getValidatedMcpServerToolsAllowed(dbs, tools));

    const startAgent = async (agentInput?: string) => {
      const agentChat = await dbs.llm_chats.insert(
        {
          name,
          user_id: userId,
          parent_chat_id: chatId,
          connection_id: connectionId,
          agent_info: {
            name: agentName,
            prompt: [
              "You are part of an agentic workflow and you have the following limits: " +
                JSON.stringify({ maxIterations, maxTokens }),
              "Use the tools as needed to complete your tasks.",
              "Be concise and to the point.",
              "It is crucial that you use the least amount of steps, input and output that is necessary to complete your goal and instructions. ",
              "When you are ready you must respond with the required output format.",
              "",
              "Below is your prompt:",
              prompt /* provided as first message */,
            ].join("\n"),
            outputSchema,
            maxIterations,
          },
          model: model.id,
          max_total_cost_usd: maxCostUSD.toString(),
          extra_body: {
            max_tokens: maxTokens,
            temperature,
          },
          /**
           * satisfies added due to weird ts behaviour (hidden conversion to any) but.
           * TODO: detect why and where else TS is silently failing to show errors due to outputSchema complexity
           * */
        } satisfies DBSSchemaForInsert["llm_chats"],
        { returning: "*" },
      );
      if (toolsWithInfo?.length) {
        await dbs.llm_chats_allowed_mcp_tools.insert(
          toolsWithInfo.map(({ id, server_name }) => {
            return {
              chat_id: agentChat.id,
              tool_id: id,
              server_name,
              auto_approve: true, // TODO: make approvable in UI
            } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
          }),
        );
      }

      await dbsClientFunctions.askLLM.run({
        chatId: agentChat.id,
        type: "new-message",
        userMessage: [
          {
            type: "text",
            text: agentInput || "",
          },
        ],
        connectionId,
        schema: "",
      });

      let chatStatus = null as DBSSchema["llm_chats"]["status"];
      const { timeout } = containerConfiguration;
      do {
        if (Date.now() - started > timeout) {
          throw new Error(
            [
              `Agent ${agentName} timed out after ${(timeout / 1000).toFixed(2)} seconds.`,
              `chat id: ${agentChat.id}`,
              `chat status: ${JSON.stringify(chatStatus)}`,
            ].join("\n"),
          );
        }
        if (signal?.aborted) {
          throw new Error(
            `Agent ${agentName} stopped due to workflow execution being aborted.`,
          );
        }
        await tout(500);
        const chat = await dbs.llm_chats.findOne(
          { id: agentChat.id },
          { select: { status: 1 } },
        );
        chatStatus = chat?.status ?? null;
      } while (!chatStatus || chatStatus.state === "loading");

      if (chatStatus.state === "stopped") {
        throw new Error(
          `Agent ${agentName} failed with error: ${chatStatus.reason}`,
        );
      }

      if (chatStatus.state === "goal-data-validation-failure") {
        throw new Error(
          `Agent ${agentName} failed because the output did not match the expected schema. Error details: ${chatStatus.error}, Output data: ${JSON.stringify(chatStatus.data)}`,
        );
      }
      return chatStatus.data;
    };
    const agentHandler = (input: string) => {
      if (!runInSequence) {
        return startAgent(input);
      }
      return enqueueAgentExecution(() => startAgent(input));
    };
    agentHandlers.set(agentName, agentHandler);
  }

  return {
    agentHandlers,
    agentConfigsWithDefaults,
    orchestrationToolsHandler,
  };
};
