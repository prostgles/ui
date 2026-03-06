import { FlexCol } from "@components/Flex";
import { getDurationAsStr } from "@components/Stopwatch";
import { mdiCogs, mdiRobotOutline, mdiTimerSand } from "@mdi/js";
import React from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import { isEmpty } from "src/utils/utils";
import { HeaderList } from "../common/HeaderList";
import { AgenticWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";

import type { DBSSchema } from "@common/publishUtils";
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
    timeOutInSeconds,
    agentDefinitions,
    orchestrationTools,
    databaseAccessDefinitions,
    userInput,
    newTables,
  } = workflow.definition_data;
  const { name } = workflow;
  const dbAccess = databaseAccessDefinitions;

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

      {orchestrationTools && (
        <McpToolAccess value={orchestrationTools} title="Orchestration tools" />
      )}

      {agentDefinitions && (
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
