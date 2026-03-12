import { FlexCol } from "@components/Flex";
import React from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { AgenticWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";

import type { DBSSchema } from "@common/publishUtils";
import { HeaderSection } from "@components/HeaderSection";
import { AgentDefinition } from "./AgentDefinition";
import { ContainerConfigurationEditor } from "./ContainerConfigurationEditor";
import { McpToolAccess } from "./McpToolAccess";

export const AgenticWorkflowDetails = ({
  workflow,
  userInputState,
}: {
  workflow: DBSSchema["agentic_workflows"];
  userInputState: ReturnType<typeof useAgenticWorkflowUserInput>;
}) => {
  const {
    agentDefinitions,
    orchestrationTools,
    databaseAccessDefinitions,
    newTables,
  } = workflow.definition_data;
  const { name } = workflow;
  const dbAccess = databaseAccessDefinitions;

  return (
    <FlexCol className="f-1 gap-0">
      <FlexCol className="w-full p-1 o-auto">
        <div className="font-18 bold" title={`Workflow id: ${workflow.id}`}>
          {name}
        </div>

        <ContainerConfigurationEditor workflow={workflow} />

        <DatabaseAccessEditor
          value={dbAccess}
          onChange={undefined}
          newTables={newTables}
        />

        {orchestrationTools && (
          <McpToolAccess
            value={orchestrationTools}
            title="Orchestration tools"
          />
        )}

        {agentDefinitions && (
          <HeaderSection title="Agents">
            {Object.keys(agentDefinitions).map((agentName) => (
              <AgentDefinition
                key={agentName}
                agentName={agentName}
                workflow={workflow}
              />
            ))}
          </HeaderSection>
        )}
      </FlexCol>
      <AgenticWorkflowUserInput {...userInputState} />
    </FlexCol>
  );
};
