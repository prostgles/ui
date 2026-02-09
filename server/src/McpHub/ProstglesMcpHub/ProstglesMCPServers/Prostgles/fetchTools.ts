import { getProstglesState } from "@src/init/tryStartProstgles";
import { isDefined } from "prostgles-types";
import type { ProstglesMcpServerHandlerInstance } from "../../ProstglesMCPServerTypes";
import { getOrCreateDockerMCPServerProxy } from "../../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import { askQuestionsToolSchema } from "./schemas/askQuestionsToolSchema";
import { getAgenticWorkflowToolSchema } from "./schemas/getAgenticToolSchemas";
import { getCreateContainerToolSchema } from "./schemas/getCreateContainerToolSchema";
import { getSuggestToolsSchema } from "./schemas/getSuggestToolsSchema";
import { suggestDashboardsToolSchema } from "./schemas/suggestDashboardsToolSchema";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";

export const fetchTools: ProstglesMcpServerHandlerInstance["fetchTools"] =
  async (dbs, { dbTools, mcpTools, toolsAllowed }) => {
    const { createContainerToolSchema, suggestAgenticWorkflowSchema } =
      await (async () => {
        if (
          !toolsAllowed.find(
            (t) =>
              t.tool_name === "create_container" ||
              t.tool_name === "suggest_agentic_workflow",
          )
        ) {
          return {};
        }
        /** Used to show error early if docker is not setup */
        await getOrCreateDockerMCPServerProxy(getProstglesState().isElectron);

        const workflowSchema = getAgenticWorkflowToolSchema({
          availableDBTools: dbTools,
          availableMCPTools: mcpTools,
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

    return [
      createContainerToolSchema,
      suggestDashboardsToolSchema,
      suggestAgenticWorkflowSchema,
      {
        ...taskTool,
        inputSchema: taskTool.input_schema as McpTool["inputSchema"],
      },
      askQuestionsToolSchema,
    ].filter(isDefined);
  };
