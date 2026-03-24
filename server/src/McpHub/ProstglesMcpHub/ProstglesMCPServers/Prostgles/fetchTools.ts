import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { getOrCreateDockerMCPServerProxy } from "../../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type { ProstglesMcpServerHandlerTypedFetchTools } from "../../ProstglesMCPServerTypes";
import { getAgenticWorkflowToolSchema } from "./schemas/getAgenticToolSchemas";
import { getContainerToolSchemas } from "./schemas/getContainerToolSchemas";
import { prostglesUiToolSchemas } from "./schemas/prostglesUiToolSchemas";
import { suggestDashboardsToolSchema } from "./schemas/suggestDashboardsToolSchema";

export const fetchTools: ProstglesMcpServerHandlerTypedFetchTools<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]
> = async (dbs, { mcpTools, toolsAllowed, connection_id }) => {
  const { createContainerToolSchema, suggestAgenticWorkflowSchema } =
    await (async () => {
      if (
        !toolsAllowed.find((t) => {
          const toolName =
            t.tool_name as keyof (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"];
          return (
            toolName === "run_code_in_sandbox" ||
            toolName === "run_typescript_in_nodejs" ||
            toolName === "create_agentic_workflow"
          );
        })
      ) {
        return {};
      }
      /** Used to show error early if docker is not setup */
      await getOrCreateDockerMCPServerProxy();

      const suggestAgenticWorkflowSchema = await getAgenticWorkflowToolSchema({
        availableMCPTools: mcpTools,
        dbs,
        connection_id,
      });

      const createContainerToolSchema = getContainerToolSchemas(mcpTools);
      return {
        suggestAgenticWorkflowSchema,
        createContainerToolSchema,
      };
    })();

  return {
    ...prostglesUiToolSchemas,
    ...createContainerToolSchema,
    create_agentic_workflow: suggestAgenticWorkflowSchema,
    create_dashboards: suggestDashboardsToolSchema,
  };
};
