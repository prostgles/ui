import { stringify, type ToolUse } from "./utils";

const workflow_function_definition = `
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
  ${JSON.stringify(
    {
      name: "Test Workflow",
      toolDefinitions: {
        fetch_webpage: {
          mcpServerName: "fetch",
          toolNames: ["fetch"],
        },
        query_database: {
          mcpServerName: "database",
          toolNames: ["select"],
        },
      },
      agentDefinitions: {
        researcher: {
          prompt: "You are a research assistant.",
          outputSchema: {
            summary: "string",
            references: "string[]",
          },
        },
      },
    },
    null,
    2,
  )},
  async ({ researcher }) => {
    const result = await researcher("Prostgles");
    result.summary;
  },
);
`;

export const agenticWorkflowToolUse: ToolUse = {
  content:
    "Based on your requirements, I suggest the following agentic workflow.",
  tool: [
    {
      id: "agentic-workflow-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_agentic_workflow",
        arguments: stringify({ workflow_function_definition }),
      },
    },
  ],
};
