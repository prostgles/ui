import type { DBS } from "@src/index";
import type { getValidatedMcpServerToolsAllowed } from "./agenticWorkflow/definitionValidation/getValidatedMcpServerToolsAllowed";
import type { getAgentConfigWithDefaults } from "./agenticWorkflow/proxyHandlers/getAgentConfigWithDefaults";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import { tout } from "@src/utils/tout";
import type { GeneratedFunctionSchema } from "@common/DBGeneratedSchema";
import { AGENT_GOAL_TOOL_NAMES } from "@src/serverFunctions/askLLM/agentConstants";

export const startAgent = async (
  agentInput: string | undefined,
  {
    name,
    toolsWithInfo,
    configWithDefaults,
    autoApproveAllTools,
  }: {
    name: string;
    toolsWithInfo:
      | undefined
      | Awaited<ReturnType<typeof getValidatedMcpServerToolsAllowed>>;
    configWithDefaults: Awaited<ReturnType<typeof getAgentConfigWithDefaults>>;
    autoApproveAllTools: boolean;
  },
  {
    dbs,
    chatId,
    connectionId,
    userId,
    signal,
    askLLM,
    started,
    timeout,
  }: {
    dbs: DBS;
    userId: string;
    chatId: number;
    connectionId: string;
    askLLM: GeneratedFunctionSchema["askLLM"];
    signal: AbortSignal | undefined;
    timeout: number;
    started: number;
  },
) => {
  const {
    model,
    prompt,
    outputSchema,
    maxCostUSD,
    maxIterations,
    maxTokens,
    temperature,
  } = configWithDefaults;
  const agentChat = await dbs.llm_chats.insert(
    {
      name,
      user_id: userId,
      parent_chat_id: chatId,
      connection_id: connectionId,
      agent_info: {
        name,
        prompt: [
          "You are part of an agentic workflow and you have the following limits: " +
            JSON.stringify({ maxIterations, maxTokens }),
          "Use the tools as needed to complete your tasks.",
          "Be concise and to the point.",
          "It is crucial that you use the least amount of steps, input and output that is necessary to complete your goal and instructions. ",
          "When you are ready you must respond with the required output format.",
          `You must use the ${Object.values(AGENT_GOAL_TOOL_NAMES)} tools to return your final answer or bail out, and the output of that tool must match the expected output schema.`,
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
          auto_approve: autoApproveAllTools,
        } satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"];
      }),
    );
  }

  await askLLM({
    chatId: agentChat.id,
    type: "new-message",
    userMessage: [
      {
        type: "text",
        text: agentInput || "continue",
      },
    ],
    connectionId,
    schema: "",
  });

  let chatStatus = null as DBSSchema["llm_chats"]["status"];
  do {
    if (Date.now() - started > timeout) {
      throw new Error(
        [
          `Agent ${name} timed out after ${(timeout / 1000).toFixed(2)} seconds.`,
          `chat id: ${agentChat.id}`,
          `chat status: ${JSON.stringify(chatStatus)}`,
        ].join("\n"),
      );
    }
    if (signal?.aborted) {
      throw new Error(
        `Agent ${name} stopped due to workflow execution being aborted.`,
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
    throw new Error(`Agent ${name} failed with error: ${chatStatus.reason}`);
  }

  if (chatStatus.state === "goal-data-validation-failure") {
    throw new Error(
      `Agent ${name} failed because the output did not match the expected schema. Error details: ${chatStatus.error}, Output data: ${JSON.stringify(chatStatus.data)}`,
    );
  }
  return chatStatus.data;
};
