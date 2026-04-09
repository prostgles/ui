import { getMCPFullToolName } from "common/mcpUtils";

export const stringify = (obj: any) => JSON.stringify(obj, null, 2);

export type ToolUse = {
  content?: string;
  tool: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  duration?: number;
  result_content?: string;
};

export type Scenario = {
  firstMessage: string;
  steps: ToolUse[];
};

let counter = 0;
export const makeToolUse = (
  serverName: string,
  toolName: string,
  input: Record<string, unknown> | undefined,
): ToolUse["tool"][number] => ({
  type: "function",
  id: `${serverName}-${toolName}-${counter++}`,
  function: {
    name: getMCPFullToolName(serverName, toolName),
    arguments: JSON.stringify(input ?? {}),
  },
});
