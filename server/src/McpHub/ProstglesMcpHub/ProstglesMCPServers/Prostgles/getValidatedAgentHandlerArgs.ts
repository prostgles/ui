import type { DBS } from "@src/index";
import { isEmpty } from "prostgles-types";
import type { AgentDefinition } from "./defineAgenticWorkflow";

export const getValidatedAgentHandlerArgs = async (
  {
    agentName,
    agentConfig,
  }: { agentName: string; agentConfig: AgentDefinition<string[]> },
  {
    dbs,
  }: {
    dbs: DBS;
  },
) => {
  const {
    modelName = "claude-4.5-sonnet-20250929",
    prompt,
    outputSchema,
    maxCostUSD = 10,
    maxIterations = 5,
    maxTokens = 6_000,
    temperature = 0.0,
    allowedToolDefinitionNames,
  } = agentConfig;
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
            name: { $ilike: `%/${modelName}` },
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

  return {
    model,
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
