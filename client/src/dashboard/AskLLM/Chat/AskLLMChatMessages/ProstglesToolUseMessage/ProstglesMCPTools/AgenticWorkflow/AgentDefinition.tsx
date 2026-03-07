import { FlexCol, FlexRow } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useCallback, useState } from "react";

import { isDefined } from "@common/filterUtils";
import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import { FormFieldDebounced } from "@components/FormField/FormFieldDebounced";
import { Icon } from "@components/Icon/Icon";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Select } from "@components/Select/Select";
import { mdiCogOutline, mdiRobotOutline, mdiTools } from "@mdi/js";
import { useMcpToolsSelectOptions } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpToolsSelectOptions";
import { isNotEmpty } from "prostgles-types";
import { LLMModelSelector } from "src/dashboard/AskLLM/LLMModelSelector";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";
import { McpToolAccess } from "./McpToolAccess";

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
  const { agentDefinitions = {} } = workflow.definition_data;

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
    tools: agentTools,
  } = agentDefinition;
  const { options, tools } = useMcpToolsSelectOptions();
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

  const agentToolsList =
    agentTools &&
    Object.entries(agentTools)
      .flatMap(([mcpServerName, toolNameObj = {}]) => {
        const toolNames = Object.keys(toolNameObj);
        return toolNames.map((toolName) => {
          const tool = tools?.find(
            (t) => t.server_name === mcpServerName && t.name === toolName,
          );
          if (!tool) return;
          return {
            mcpServerName,
            toolName,
            id: tool.id,
          };
        });
      })
      .filter(isDefined);

  return (
    <FlexCol
      className="rounded b b-color p-p5 min-w-0 relative"
      style={{ fontWeight: "normal" }}
    >
      <FlexRow className="gap-p5">
        <Icon path={mdiRobotOutline} />
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
      {expanded ?
        <Select
          value={agentToolsList?.map((t) => t.id)}
          size="small"
          multiSelect={true}
          fullOptions={options}
          btnProps={{
            children:
              agentToolsList ?
                `${agentToolsList.length} tool${agentToolsList.length > 1 ? "s" : ""} selected`
              : "Select tools",
            variant: "faded",
            iconPath: mdiTools,
          }}
          onChange={(newToolIds) => {
            const newAgentTools: Partial<
              Record<string, Partial<Record<string, 1>>>
            > = {};
            tools?.forEach(({ id, server_name, name }) => {
              if (!newToolIds.includes(id)) return;
              newAgentTools[server_name] ??= {};
              newAgentTools[server_name][name] = 1;
            });
            void updateAgentDefinition({
              tools: newAgentTools,
            });
          }}
        />
      : isNotEmpty(agentTools) ?
        <McpToolAccess title="Agent tools" value={agentTools} />
      : null}
      <ScrollFade
        className="o-auto min-w-0"
        style={{ maxHeight: expanded ? "400px" : "150px" }}
      >
        {expanded ?
          <CodeEditorWithSaveButton
            label="Agent prompt"
            value={prompt}
            language="markdown"
            onSave={(newPrompt) => {
              void updateAgentDefinition({ prompt: newPrompt });
            }}
          />
        : <Marked
            codeHeader={undefined}
            content={slicePrompt(prompt)}
            loadedSuggestions={undefined}
            prgl={prgl}
            sqlHandler={undefined}
          />
        }
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
