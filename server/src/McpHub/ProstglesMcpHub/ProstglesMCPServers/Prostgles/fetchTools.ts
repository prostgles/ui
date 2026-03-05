import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { getOrCreateDockerMCPServerProxy } from "../../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type { ProstglesMcpServerHandlerTypedFetchTools } from "../../ProstglesMCPServerTypes";
import { getAgenticWorkflowToolSchema } from "./schemas/getAgenticToolSchemas";
import { getCreateContainerToolSchema } from "./schemas/getCreateContainerToolSchema";
import { getSuggestToolsSchema } from "./schemas/getSuggestToolsSchema";
import { prostglesUiToolSchemas } from "./schemas/prostglesUiToolSchemas";
import { suggestDashboardsToolSchema } from "./schemas/suggestDashboardsToolSchema";

export const fetchTools: ProstglesMcpServerHandlerTypedFetchTools<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]
> = async (dbs, { dbTools, mcpTools, toolsAllowed }) => {
  const { createContainerToolSchema, suggestAgenticWorkflowSchema } =
    await (async () => {
      if (
        !toolsAllowed.find(
          (t) =>
            t.tool_name === "run_code_in_sandbox" ||
            t.tool_name === "suggest_agentic_workflow",
        )
      ) {
        return {};
      }
      /** Used to show error early if docker is not setup */
      await getOrCreateDockerMCPServerProxy();

      const workflowSchema = await getAgenticWorkflowToolSchema({
        availableDBTools: dbTools,
        availableMCPTools: mcpTools,
        dbs,
      });
      const suggestAgenticWorkflowSchema = {
        ...workflowSchema,
        inputSchema: workflowSchema.input_schema as McpTool["inputSchema"],
      };
      const createContainerToolSchema = getCreateContainerToolSchema(dbTools);
      return {
        suggestAgenticWorkflowSchema,
        createContainerToolSchema,
      };
    })();

  const taskTool = getSuggestToolsSchema({
    availableDBTools: dbTools,
    availableMCPTools: mcpTools,
  });

  return {
    ...prostglesUiToolSchemas,
    suggest_agentic_workflow: suggestAgenticWorkflowSchema,
    run_code_in_sandbox: createContainerToolSchema,
    suggest_tools_and_prompt: taskTool,
    suggest_dashboards: suggestDashboardsToolSchema,
  };
};
