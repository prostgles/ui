import type { DBSSchema } from "@common/publishUtils";
import React, { useMemo } from "react";
import { HeaderList } from "../common/HeaderList";
import { mdiTools } from "@mdi/js";

type P = {
  title: string;
  value:
    | DBSSchema["agentic_workflows"]["definition_data"]["orchestrationTools"]
    | undefined;
};
export const McpToolAccess = ({ value, title }: P) => {
  const combinedToolNames = useMemo(() => {
    const result = new Map<string, Set<string>>();
    Object.entries(value ?? {}).forEach(
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
  }, [value]);

  return (
    <HeaderList
      title={title}
      iconPath={mdiTools}
      items={combinedToolNames.map(([mcpServerName, toolNames]) => (
        <span>
          {mcpServerName}:{" "}
          <span style={{ fontWeight: "normal" }}>{toolNames.join(", ")}</span>
        </span>
      ))}
    />
  );
};
