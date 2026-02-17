import { getEntries } from "@common/utils";
import { FlexCol } from "@components/Flex";
import { mdiCogs, mdiRobotOutline, mdiTools } from "@mdi/js";
import React, { useMemo } from "react";
import { DatabaseAccessPermissions } from "../common/DatabaseAccessPermissions";
import { HeaderList } from "../common/HeaderList";
import { type ValidatedWorkflow } from "./useValidatedWorkflowJson";
import { AgenticWorkflowUserInput } from "./AgenticWorkflowUserInput";
import type { useAgenticWorkflowUserInput } from "./hooks/useAgenticWorkflowUserInput";
import { isEmpty } from "src/utils/utils";

export const AgenticWorkflowDetails = ({
  validatedWorkflow,
  userInputState,
}: {
  validatedWorkflow: ValidatedWorkflow;
  userInputState: ReturnType<typeof useAgenticWorkflowUserInput>;
}) => {
  const {
    name,
    timeOutInSeconds,
    agentDefinitions,
    toolDefinitions,
    databaseAccessDefinitions,
    userInput,
  } = validatedWorkflow;
  const dbAccess = databaseAccessDefinitions;
  const combinedToolNames = useMemo(() => {
    const result = new Map<string, Set<string>>();
    Object.values(toolDefinitions).forEach(({ mcpServerName, toolNames }) => {
      const existing = result.get(mcpServerName) ?? new Set<string>();
      toolNames.forEach((toolName) => {
        existing.add(toolName);
      });
      result.set(mcpServerName, existing);
    });
    return Array.from(result.entries()).map(
      ([mcpServerName, toolNames]) =>
        [mcpServerName, Array.from(toolNames)] as const,
    );
  }, [toolDefinitions]);

  return (
    <FlexCol className="w-full p-1 o-auto">
      <div className="font-18 bold">{name}</div>
      <div style={{ opacity: 0.7, marginBottom: "0.5em" }}>
        Timeout: {timeOutInSeconds} seconds
      </div>
      <DatabaseAccessPermissions
        {...(!dbAccess ? { Mode: "None" }
        : dbAccess.mode === "custom" ?
          {
            Mode: "Custom",
            tables: getEntries(dbAccess.tablePermissions).map(
              ([tableName, permissions]) => ({
                tableName,
                ...permissions,
              }),
            ),
          }
        : {
            Mode: dbAccess.mode,
          })}
      />

      <HeaderList
        title="MCP Tools"
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
        items={Object.entries(agentDefinitions).map(
          ([agentName, { prompt }]) => (
            <span>
              {agentName}:{" "}
              <span style={{ fontWeight: "normal" }}>{prompt}</span>
            </span>
          ),
        )}
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
