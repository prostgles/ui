import { FlexCol, FlexRowWrap } from "@components/Flex";
import {
  mdiCpu64Bit,
  mdiMemory,
  mdiTimelapse,
  mdiWeb,
  mdiWebOff,
} from "@mdi/js";
import React, { useState } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { isEmpty } from "src/utils/utils";
import { AgenticWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";

import type { DBSSchema } from "@common/publishUtils";
import Chip from "@components/Chip";
import FormField from "@components/FormField/FormField";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { HeaderSection } from "../common/HeaderSection";
import { AgentDefinition } from "./AgentDefinition";
import { McpToolAccess } from "./McpToolAccess";

export const AgenticWorkflowDetails = ({
  workflow,
  userInputState,
}: {
  workflow: DBSSchema["agentic_workflows"];
  userInputState: ReturnType<typeof useAgenticWorkflowUserInput>;
}) => {
  const {
    containerConfiguration,
    agentDefinitions,
    orchestrationTools,
    databaseAccessDefinitions,
    userInput,
    newTables,
  } = workflow.definition_data;
  const { id, name, definition_override } = workflow;
  const dbAccess = databaseAccessDefinitions;
  const { dbs } = usePrglCore();
  const containerConfigurationWithOverrides = {
    ...containerConfiguration,
    ...definition_override?.containerConfiguration,
  };
  const {
    timeout,
    cpus = 1,
    memory = "512m",
    internetAccess = "none",
  } = containerConfigurationWithOverrides;

  const updateContainerConfiguration = async (
    newConfig: Partial<typeof containerConfiguration>,
  ) => {
    await dbs.agentic_workflows.update(
      { id, chat_id: workflow.chat_id, user_id: workflow.user_id },
      {
        definition_override: {
          ...workflow.definition_override,
          containerConfiguration: {
            ...workflow.definition_override?.containerConfiguration,
            ...newConfig,
          },
        },
      },
    );
  };
  const [expandContainerConfig, setExpandContainerConfig] = useState(false);

  return (
    <FlexCol className="w-full p-1 o-auto">
      <div className="font-18 bold" title={`Workflow id: ${workflow.id}`}>
        {name}
      </div>

      <HeaderSection title="Container configuration">
        {!expandContainerConfig ?
          <FlexRowWrap
            className="pointer "
            onClick={() => setExpandContainerConfig(true)}
          >
            <Chip
              className="text-1"
              title="Timeout"
              leftIcon={{
                path: mdiTimelapse,
              }}
            >
              {Math.round(timeout / 1000)}s
            </Chip>
            <Chip
              title="Internet access"
              className="text-1"
              leftIcon={{
                path: internetAccess === "none" ? mdiWebOff : mdiWeb,
              }}
            >
              {internetAccess}
            </Chip>
            <Chip
              className="text-1"
              title="CPUs"
              leftIcon={{
                path: mdiCpu64Bit,
              }}
            >
              {cpus}
            </Chip>
            <Chip
              title="Memory"
              leftIcon={{
                path: mdiMemory,
              }}
            >
              {memory}
            </Chip>
          </FlexRowWrap>
        : <FlexRowWrap>
            <FormField
              type="integer"
              style={{ maxWidth: "120px" }}
              label={"Timeout (s)"}
              value={Math.round(timeout / 1000)}
              onChange={(newTimeout) =>
                updateContainerConfiguration({ timeout: newTimeout * 1000 })
              }
            />
            <FormField
              label={"Internet access"}
              value={internetAccess}
              style={{ maxWidth: "120px" }}
              fullOptions={
                [
                  {
                    key: "none",
                    label: "None",
                    subLabel:
                      "Container can access internet. Uses bridge network mode.",
                  },
                  {
                    key: "full",
                    label: "Full",
                    subLabel:
                      "Container cannot access the internet. Uses bridge-internal network mode.",
                  },
                ] as const
              }
              onChange={(newValue) =>
                updateContainerConfiguration({ internetAccess: newValue })
              }
            />
            <FormField
              type="number"
              label={"CPUs"}
              style={{ maxWidth: "120px" }}
              value={Number(cpus)}
              onChange={(newValue) =>
                updateContainerConfiguration({ cpus: newValue.toString() })
              }
            />
            <FormField
              type="text"
              label={"Memory"}
              style={{ maxWidth: "120px" }}
              value={memory}
              onChange={(newValue) => {
                const isValid = /^\d+(m|g|t|k|b)?$/i.test(newValue);
                if (isValid) {
                  void updateContainerConfiguration({ memory: newValue });
                }
              }}
            />
          </FlexRowWrap>
        }
      </HeaderSection>

      <DatabaseAccessEditor
        value={dbAccess}
        onChange={undefined}
        newTables={newTables}
      />

      {orchestrationTools && (
        <McpToolAccess value={orchestrationTools} title="Orchestration tools" />
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

      {!isEmpty(userInput) && (
        <>
          <div
            style={{
              height: "1px",
              width: "100%",
              backgroundColor: "var(--b-color)",
            }}
          />
          <HeaderSection title="User Input">
            <AgenticWorkflowUserInput {...userInputState} />
          </HeaderSection>
        </>
      )}
    </FlexCol>
  );
};
