import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { isDefined } from "prostgles-types";
import { getOrCreateDockerMCPServerProxy } from "../../../DockerSandbox/dockerMCPServerProxy/dockerMCPServerProxy";
import type { ProstglesMcpServerHandlerInstance } from "../../ProstglesMCPServerTypes";
import { askQuestionsToolSchema } from "./schemas/askQuestionsToolSchema";
import { getAgenticWorkflowToolSchema } from "./schemas/getAgenticToolSchemas";
import { getCreateContainerToolSchema } from "./schemas/getCreateContainerToolSchema";
import { getSuggestToolsSchema } from "./schemas/getSuggestToolsSchema";
import { getToolSchema } from "./schemas/getToolSchema";
import { suggestDashboardsToolSchema } from "./schemas/suggestDashboardsToolSchema";

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

    return [
      createContainerToolSchema,
      suggestDashboardsToolSchema,
      suggestAgenticWorkflowSchema,
      {
        ...taskTool,
        inputSchema: taskTool.input_schema as McpTool["inputSchema"],
      },
      askQuestionsToolSchema,
      getToolSchema,
    ].filter(isDefined);
  };
