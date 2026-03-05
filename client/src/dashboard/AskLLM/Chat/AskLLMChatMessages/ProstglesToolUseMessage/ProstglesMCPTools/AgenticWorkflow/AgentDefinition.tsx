import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";

import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiCogOutline, mdiTools } from "@mdi/js";
import { LLMModelSelector } from "src/dashboard/AskLLM/LLMModelSelector";
import { HeaderList } from "../common/HeaderList";
import { useLLMSetupDone } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";
import { Icon } from "@components/Icon/Icon";
import { Select } from "@components/Select/Select";

export const AgentDefinition = ({
  workflow,
  agentName,
}: {
  workflow: DBSSchema["agentic_workflows"];
  agentName: string;
}) => {
  const prgl = usePrgl();
  const { dbs } = prgl;
  const [expanded, setExpanded] = useState(false);
  const { agentDefinitions } = workflow.definition_data;

  const agentInitialDefinition = agentDefinitions[agentName]!;
  const agentConfigOverride =
    workflow.definition_override?.agentDefinitions?.[agentName];
  const agentDefinition = {
    ...agentInitialDefinition,
    ...agentConfigOverride,
  };
  const {
    prompt = agentInitialDefinition.prompt,
    maxIterations,
    modelName,
    maxTokens,
    temperature,
    tools,
  } = agentDefinition;
  // const { mcpServerIcons } = useLLMSetupDone();
  // const { data: mcpTools } = dbs.mcp_server_tools.useFind();
  const updateAgentDefinition = useCallback(
    async (updatedFields: Partial<typeof agentDefinition>) => {
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
    },
    [agentConfigOverride, agentName, dbs.agentic_workflows, workflow.id],
  );

  const agentTools =
    tools &&
    Object.entries(tools).flatMap(([mcpServerName, toolNameObj = {}]) => {
      const toolNames = Object.keys(toolNameObj);
      return toolNames.map((toolName) => {
        return {
          mcpServerName,
          toolName,
        };
      });
    });

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
      {tools && (
        <FlexRowWrap title="Agent tools" className="gap-p5">
          <Icon path={mdiTools} />
          {Object.entries(tools).map(([mcpServerName, toolNameObj = {}]) => {
            const toolNames = Object.keys(toolNameObj);
            return (
              <span key={mcpServerName} title={toolNames.join(", ")}>
                <strong>{mcpServerName}</strong>:{" "}
                <span style={{ fontWeight: "normal" }}>
                  {toolNames.join(", ")}
                </span>
              </span>
            );
          })}
          {/* {mcpTools && (
            <Select
              value={agentTools?.map((t) => `${t.mcpServerName}:${t.toolName}`)}
              size="small"
              multiSelect={true}
              fullOptions={mcpTools.map((t) => {
                return {
                  key: `${t.server_name}:${t.name}`,
                  label: `${t.server_name}  ${t.name}`,
                  subLabel: t.description,
                  icon: mcpServerIcons.get(t.server_name),
                };
              })}
              onChange={console.log}
            />
          )} */}
        </FlexRowWrap>
      )}
      <ScrollFade
        className="o-auto min-w-0"
        style={{ maxHeight: expanded ? "400px" : "150px" }}
      >
        <Marked
          codeHeader={undefined}
          content={expanded ? prompt : slicePrompt(prompt)}
          loadedSuggestions={undefined}
          prgl={prgl}
          sqlHandler={undefined}
        />
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
