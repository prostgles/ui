import { FlexCol } from "@components/Flex";
import React, { useCallback } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { UserInput } from "./UserInput";
import type { useUserInput } from "./hooks/useUserInput";

import type { DBSSchema } from "@common/publishUtils";
import { HeaderSection } from "@components/HeaderSection";
import { AgentDefinition } from "./AgentDefinition";
import { ContainerConfigurationEditor } from "./ContainerConfigurationEditor";
import { McpToolAccess } from "./McpToolAccess";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

export const AgenticWorkflowDetails = ({
  workflow,
  userInputState,
}: {
  workflow: DBSSchema["agentic_workflows"];
  userInputState: ReturnType<typeof useUserInput>;
}) => {
  const {
    agentDefinitions,
    orchestrationTools,
    databaseAccessDefinitions,
    newTables,
  } = workflow.definition_data;
  const { name, definition_summary, definition_override } = workflow;
  const dbAccess = databaseAccessDefinitions;
  const { dbs } = usePrgl();

  const updateOverride = useCallback(
    (
      newOverride: Partial<
        DBSSchema["agentic_workflows"]["definition_override"]
      >,
    ) => {
      void dbs.agentic_workflows.update(
        {
          id: workflow.id,
        },
        {
          definition_override: {
            ...definition_override,
            ...newOverride,
          },
        },
      );
    },
    [dbs.agentic_workflows, definition_override, workflow.id],
  );

  return (
    <FlexCol className="AgenticWorkflowDetails f-1 gap-0">
      <FlexCol className="w-full f-1 p-1 o-auto max-h-fit">
        <div title={`Workflow id: ${workflow.id}`} className="ta-start">
          <div className="font-18 bold">{name}</div>
          <div className="font-14">{definition_summary}</div>
        </div>

        <ContainerConfigurationEditor workflow={workflow} />

        <DatabaseAccessEditor
          value={dbAccess}
          onChange={undefined}
          newTables={newTables}
        />

        {orchestrationTools && (
          <McpToolAccess
            title="Orchestration tools"
            value={orchestrationTools}
            configs={definition_override?.orchestratorMcpServerConfigs}
            onConfigChange={(serverName, configId) => {
              void updateOverride({
                orchestratorMcpServerConfigs: {
                  ...(definition_override?.orchestratorMcpServerConfigs ?? {}),
                  [serverName]: { configId },
                },
              });
            }}
          />
        )}

        {agentDefinitions && (
          <HeaderSection title="Agents">
            {Object.keys(agentDefinitions).map((agentName) => {
              const { agentDefinitions = {} } = workflow.definition_data;

              const agentInitialDefinition = agentDefinitions[agentName]!;
              const agentConfigOverride =
                definition_override?.agentDefinitions?.[agentName];
              const agentDefinition = {
                ...agentInitialDefinition,
                ...agentConfigOverride,
              };

              return (
                <AgentDefinition
                  key={agentName}
                  agentName={agentName}
                  config={{
                    ...agentDefinition,
                    prompt:
                      agentDefinition.prompt || agentInitialDefinition.prompt,
                  }}
                  onChange={(updatedFields) => {
                    updateOverride({
                      agentDefinitions: {
                        [agentName]: {
                          ...agentConfigOverride,
                          ...updatedFields,
                        },
                      },
                    });
                  }}
                />
              );
            })}
          </HeaderSection>
        )}
      </FlexCol>
      <UserInput {...userInputState} />
    </FlexCol>
  );
};
