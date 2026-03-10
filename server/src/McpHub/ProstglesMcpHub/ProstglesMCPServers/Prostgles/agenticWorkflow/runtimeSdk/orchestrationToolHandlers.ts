import { callWorkflowProxy } from "./callWorkflowProxy";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";

export const getOrchestrationToolHandlers = (
  definitions: Parameters<DefineAgenticWorkflow>[0],
) => {
  return new Proxy({} as Parameters<Parameters<DefineAgenticWorkflow>[1]>[2], {
    get(_target, mcpServerName: string) {
      if (typeof mcpServerName !== "string") return undefined;

      if (!definitions.orchestrationTools) {
        throw new Error(
          `No tools are allowed for this workflow, but tried to access tool server "${mcpServerName}"`,
        );
      }

      const serverTools = definitions.orchestrationTools[
        mcpServerName as unknown as keyof typeof definitions.orchestrationTools
      ] as Record<string, 1> | undefined;
      if (!serverTools) {
        throw new Error(
          `MCP server "${mcpServerName}" is not defined in orchestrationTools`,
        );
      }

      return new Proxy(
        {} as Record<string, (input?: unknown) => Promise<unknown>>,
        {
          get(_serverTarget, toolName: string) {
            if (typeof toolName !== "string") return undefined;

            if (!(toolName in serverTools) || serverTools[toolName] !== 1) {
              throw new Error(
                `Tool "${toolName}" is not allowed on MCP server "${mcpServerName}"`,
              );
            }

            return (input?: Record<string, unknown>) =>
              callWorkflowProxy({
                type: "tool",
                name: `${mcpServerName}--${toolName}`,
                input,
              });
          },
        },
      );
    },
  });
};
