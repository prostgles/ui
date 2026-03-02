import { FlexCol, FlexRow } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";

import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiCogOutline } from "@mdi/js";
import { LLMModelSelector } from "src/dashboard/AskLLM/LLMModelSelector";

export const AgentDefinition = ({
  workflow,
  agentName,
}: {
  workflow: DBSSchema["agentic_workflows"];
  agentName: string;
}) => {
  const { dbs } = usePrgl();
  const [expanded, setExpanded] = useState(false);
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
    <FlexCol
      className="rounded b b-color p-p5 min-w-0 relative"
      style={{ fontWeight: "normal" }}
    >
      <FlexRow>
        <span style={{ fontWeight: "bold" }}>{agentName}</span>
        <LLMModelSelector
          modelName={modelName}
          forAgent={true}
          value={null}
          onChange={(_, { name }) => {
            void updateAgentDefinition({ modelName: name });
          }}
        />
        <Btn
          size="small"
          onClick={() => setExpanded((e) => !e)}
          iconPath={mdiCogOutline}
          variant="faded"
          color={expanded ? "action" : "default"}
          style={{
            transition: "transform 0.2s",
            // position: "absolute",
            right: "5px",
            top: "5px",
          }}
        />
      </FlexRow>
      <ScrollFade className="o-auto min-w-0" style={{ maxHeight: "150px" }}>
        {expanded ? prompt : slicePrompt(prompt)}
      </ScrollFade>
      {expanded && (
        <FlexRow>
          <FormFieldDebounced
            label="Max iterations"
            value={maxIterations}
            type="integer"
            onChange={async (newVal) => {
              await updateAgentDefinition({ maxIterations: Number(newVal) });
            }}
          />
          <FormFieldDebounced
            label="Max tokens"
            value={maxTokens}
            type="integer"
            onChange={async (newVal) => {
              await updateAgentDefinition({ maxTokens: Number(newVal) });
            }}
          />
          <FormFieldDebounced
            label="Temperature"
            value={temperature}
            type="number"
            onChange={async (newVal) => {
              await updateAgentDefinition({
                temperature: Number(newVal),
              });
            }}
          />
        </FlexRow>
      )}
    </FlexCol>
  );
};

const slicePrompt = (prompt: string | undefined) => {
  if (!prompt) return "";
  const sliced = prompt.split("\n").slice(0, 3).join("\n");
  return sliced.length < prompt.length ? sliced + "..." : sliced;
};
