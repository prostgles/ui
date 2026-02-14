import { getEntries } from "@common/utils";
import { FlexCol } from "@components/Flex";
import React, { useMemo } from "react";
import { DatabaseAccessPermissions } from "../common/DatabaseAccessPermissions";
import { type ValidatedWorkflow } from "./useValidatedWorkflowJson";
import { HeaderList } from "../common/HeaderList";
import { mdiRobotExcited, mdiTools } from "@mdi/js";

export const AgenticWorkflowDetails = ({
  name,
  timeOutInSeconds,
  agentDefinitions,
  toolDefinitions,
  databaseAccessDefinitions,
  userInput,
}: ValidatedWorkflow) => {
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
    <FlexCol className="w-full p-1">
      <div className="font-18 bold">{name}</div>
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
        iconPath={mdiRobotExcited}
        items={Object.entries(agentDefinitions).map(
          ([agentName, { prompt, modelName }]) => (
            <span>
              {agentName}:{" "}
              <span style={{ fontWeight: "normal" }}>{prompt}</span>
              {modelName ? ` (model: ${modelName})` : ""}
            </span>
          ),
        )}
      />
    </FlexCol>
  );
};
