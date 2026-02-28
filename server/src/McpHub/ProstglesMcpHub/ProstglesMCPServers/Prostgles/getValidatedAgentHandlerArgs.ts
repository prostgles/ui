import type { DBS } from "@src/index";
import { isEmpty } from "prostgles-types";
import type { AgentDefinition } from "./defineAgenticWorkflow";
import type { DBSSchema } from "@common/publishUtils";
import { DEFAULT_AGENT_MODEL } from "@src/serverFunctions/askLLM/refreshModels";

export const getValidatedAgentHandlerArgs = async (
  {
    agentName,
    agentConfig,
    definition_override,
  }: { agentName: string; agentConfig: AgentDefinition<string[]> } & Pick<
    DBSSchema["agentic_workflows"],
    "definition_override"
  >,
  dbs: DBS,
) => {
  const {
    modelName = DEFAULT_AGENT_MODEL,
    prompt,
    outputSchema,
    maxCostUSD = 10,
    maxIterations = 5,
    maxTokens = 6_000,
    temperature = 0.0,
    allowedToolDefinitionNames,
  } = { ...agentConfig, ...definition_override?.agentDefinitions?.[agentName] };
  if (!prompt) {
    throw new Error(`Agent ${agentName} is missing a prompt`);
  }
  if (isEmpty(outputSchema)) {
    throw new Error(`Agent ${agentName} outputSchema is empty`);
  }
  assertNumberIsNonNegativeFinite(maxCostUSD, agentName, "maxCostUSD");
  assertNumberIsNonNegativeFinite(maxIterations, agentName, "maxIterations");
  assertNumberIsNonNegativeFinite(maxTokens, agentName, "maxTokens");
  assertNumberIsNonNegativeFinite(temperature, agentName, "temperature");

  const model = await dbs.llm_models.findOne({
    $and: [
      {
        $or: [
          {
            name: modelName,
          },
          {
            /** Match OpenRouter models which get prefixed then with provider name */
            name: { $ilike: `%${modelName}%` },
          },
        ],
      },
      {
        $existsJoined: {
          ["llm_providers.llm_credentials" as "llm_credentials"]: {},
        },
      },
    ],
  });
  if (!model) {
    throw new Error(
      `${!agentConfig.modelName ? "Default " : ""}Model ${modelName} not found or has no credentials`,
    );
  }

  if (!model.mcp_tool_support) {
    throw new Error(
      `Model ${modelName} does not support tools and cannot be used in an agentic workflow`,
    );
  }

  return {
    model,
    modelName: model.name,
    prompt,
    outputSchema,
    allowedToolDefinitionNames,
    maxCostUSD,
    maxIterations,
    maxTokens,
    temperature,
  };
};

const assertNumberIsNonNegativeFinite = (
  value: number,
  agentName: string,
  name: string,
) => {
  if (value < 0 || !Number.isFinite(value)) {
    throw new Error(
      `Agent ${agentName} has invalid ${name}. It must be a non-negative finite number.`,
    );
  }
};
