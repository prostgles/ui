import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { tout } from "@src/utils/tout";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";
import { getValidatedAgentHandlerArgs } from "./getValidatedAgentHandlerArgs";
import { getValidatedWorkflowTools } from "./getValidatedWorkflowTools";

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

export const createAgentHandlers = async <P extends DefineAgenticWorkflow>(
  dbsFunctions: {
    [K in keyof GeneratedFunctionSchema]: {
      run: GeneratedFunctionSchema[K];
    };
  },
  {
    name,
    toolDefinitions,
    agentDefinitions,
    timeOutInSeconds,
  }: Parameters<P>[0],
  {
    dbs,
    chatId,
    userId,
    connectionId,
  }: {
    dbs: DBS;
    chatId: number;
    userId: string;
    connectionId: string;
  },
  runInSequence = true,
) => {
  const agentHandlers = new Map<string, (agentInput: string) => Promise<any>>();
  const started = Date.now();
  const user = await dbs.users.findOne({ id: userId });
  if (!user) {
    throw new Error(`User with id ${userId} not found`);
  }
  const { validatedTools } = await getValidatedWorkflowTools(
    toolDefinitions || {},
    dbs,
  );

  for (const [agentName, config] of Object.entries(agentDefinitions)) {
    const {
      model,
      prompt,
      outputSchema,
      allowedToolDefinitionNames,
      maxCostUSD,
      maxIterations,
      maxTokens,
      temperature,
    } = await getValidatedAgentHandlerArgs(
      { agentName, agentConfig: config },
      dbs,
    );

    const tools = allowedToolDefinitionNames
      ?.map((allowedToolDefName) => {
        if (!toolDefinitions) {
          throw new Error(
            `Agent ${agentName} has allowedToolNames but no toolDefinitions provided`,
          );
        }
        const tools = validatedTools.get(allowedToolDefName);
        if (!tools) {
          throw new Error(
            `Agent ${agentName} has allowedToolNames but no toolDefinitions provided`,
          );
        }
        return tools;
      })
      .flat();

    const startAgent = async (agentInput?: string) => {
      const workflowChat = await dbs.llm_chats.insert(
        {
          name,
          user_id: userId,
          parent_chat_id: chatId,
          connection_id: connectionId,
          agent_info: {
            prompt: [
              "You are part of an agentic workflow.",
              "Follow the instructions carefully.",
              "Use the tools as needed to complete your tasks.",
              "Be concise and to the point.",
              "When you are ready you must respond with the required output format.",
              "",
              "Below your prompt:",
              prompt, // provided as first message
            ].join("\n"),
            outputSchema: outputSchema,
          },
          model: model.id,
          max_total_cost_usd: maxCostUSD,
          extra_body: {
            max_tokens: maxTokens,
            temperature,
          },
        },
        { returning: "*" },
      );
      if (tools?.length) {
        await dbs.llm_chats_allowed_mcp_tools.insert(
          tools
            .map(({ serverTools, configId }) =>
              serverTools.map(({ id, server_name }) => {
                return {
                  chat_id: workflowChat.id,
                  tool_id: id,
                  server_name,
                  server_config_id: configId,
                  auto_approve: true, // TODO: make approvable in UI
                } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
              }),
            )
            .flat(),
        );
      }

      await dbsFunctions.askLLM.run({
        chatId: workflowChat.id,
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
      while (!chatStatus || chatStatus.state === "loading") {
        await tout(500);
        const chat = await dbs.llm_chats.findOne(
          { id: workflowChat.id },
          { select: { status: 1 } },
        );
        chatStatus = chat?.status ?? null;
        if (Date.now() - started > timeOutInSeconds * 1000) {
          throw new Error(
            `Agent ${agentName} timed out after ${timeOutInSeconds} seconds`,
          );
        }
      }
      if (chatStatus.state === "stopped") {
        throw new Error(
          `Agent ${agentName} failed with error: ${chatStatus.reason ?? "unknown error"}`,
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
  };
};
