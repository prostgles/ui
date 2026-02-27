import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";

import type { DBSSchema } from "@common/publishUtils";
import FormField from "@components/FormField/FormField";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { LLMModelSelector } from "src/dashboard/AskLLM/LLMModelSelector";

export const AgentDefinition = ({
  workflow,
  agentName,
}: {
  workflow: DBSSchema["agentic_workflows"];
  agentName: string;
}) => {
  const { dbs } = usePrgl();
  const { agentDefinitions } = workflow.definition_data;

  const agentInitialDefinition = agentDefinitions[agentName];
  const agentConfigOverride =
    workflow.definition_override?.agentDefinitions?.[agentName] ?? {};
  const agentDefinition = {
    ...agentInitialDefinition,
    ...agentConfigOverride,
  };
  const { prompt, maxIterations, modelName, maxTokens, temperature } =
    agentDefinition;

  const updateAgentDefinition = async (
    updatedFields: Partial<typeof agentDefinition>,
  ) => {
    await dbs.agentic_workflows.update(
      {
        id: workflow.id,
      },
      {
        definition_override: {
          agentDefinitions: {
            [agentName]: {
              ...agentConfigOverride,
              ...updatedFields,
            },
          },
        },
      },
    );
  };
  return (
    <FlexCol className="rounded b b-color-0 p-p5 min-w-0">
      {agentName}
      <LLMModelSelector
        modelName={modelName}
        forAgent={true}
        value={null}
        onChange={(_, { name }) => {
          void updateAgentDefinition({ modelName: name });
        }}
      />
      <ScrollFade className="o-auto min-w-0" style={{ maxHeight: "150px" }}>
        {prompt}
      </ScrollFade>
      <FormField
        label="Max iterations"
        value={maxIterations}
        type="integer"
        onChange={async (newVal) => {
          await updateAgentDefinition({ maxIterations: newVal });
        }}
      />
      <FormField
        label="Max tokens"
        value={maxTokens}
        type="integer"
        onChange={async (newVal) => {
          await updateAgentDefinition({ maxTokens: newVal });
        }}
      />
      <FormField
        label="Temperature"
        value={temperature}
        type="number"
        onChange={async (newVal) => {
          await updateAgentDefinition({
            temperature: Number(newVal),
          });
        }}
      />
    </FlexCol>
  );
};
