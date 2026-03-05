import { FlexCol } from "@components/Flex";
import { getDurationAsStr } from "@components/Stopwatch";
import { mdiCogs, mdiRobotOutline, mdiTimerSand, mdiTools } from "@mdi/js";
import React, { useMemo } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { isEmpty } from "src/utils/utils";
import { HeaderList } from "../common/HeaderList";
import { AgenticWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";

import type { DBSSchema } from "@common/publishUtils";
import { AgentDefinition } from "./AgentDefinition";

export const AgenticWorkflowDetails = ({
  workflow,
  userInputState,
}: {
  workflow: DBSSchema["agentic_workflows"];
  userInputState: ReturnType<typeof useAgenticWorkflowUserInput>;
}) => {
  const {
    timeOutInSeconds,
    agentDefinitions,
    orchestrationTools,
    databaseAccessDefinitions,
    userInput,
    newTables,
  } = workflow.definition_data;
  const { name } = workflow;
  const dbAccess = databaseAccessDefinitions;
  const combinedToolNames = useMemo(() => {
    const result = new Map<string, Set<string>>();
    Object.entries(orchestrationTools ?? {}).forEach(
      ([mcpServerName, toolNamesObj = {}]) => {
        const toolNames = Object.keys(toolNamesObj);
        const existing = result.get(mcpServerName) ?? new Set<string>();
        toolNames.forEach((toolName) => {
          existing.add(toolName);
        });
        result.set(mcpServerName, existing);
      },
    );
    return Array.from(result.entries()).map(
      ([mcpServerName, toolNames]) =>
        [mcpServerName, Array.from(toolNames)] as const,
    );
  }, [orchestrationTools]);

  return (
    <FlexCol className="w-full p-1 o-auto">
      <div className="font-18 bold" title={`Workflow id: ${workflow.id}`}>
        {name}
      </div>
      <HeaderList
        title="Timeout"
        iconPath={mdiTimerSand}
        items={[getDurationAsStr(timeOutInSeconds * 1000)]}
      />

      <DatabaseAccessEditor
        value={dbAccess}
        onChange={undefined}
        newTables={newTables}
      />

      <HeaderList
        title="Orchestration tools"
        iconPath={mdiTools}
        items={combinedToolNames.map(([mcpServerName, toolNames]) => (
          <span>
            {mcpServerName}:{" "}
            <span style={{ fontWeight: "normal" }}>{toolNames.join(", ")}</span>
          </span>
        ))}
      />

      <HeaderList
        title="Agents"
        iconPath={mdiRobotOutline}
        items={Object.keys(agentDefinitions).map((agentName) => (
          <AgentDefinition
            key={agentName}
            agentName={agentName}
            workflow={workflow}
          />
        ))}
      />

      {!isEmpty(userInput) && (
        <>
          <div
            style={{
              height: "1px",
              width: "100%",
              backgroundColor: "var(--b-color)",
            }}
          />
          <HeaderList
            title="User Input"
            iconPath={mdiCogs}
            items={[<AgenticWorkflowUserInput {...userInputState} />]}
          />
        </>
      )}
    </FlexCol>
  );
};
