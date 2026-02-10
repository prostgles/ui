import { stringify, type ToolUse } from "./utils";

const workflow_function_definition = `
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
export default defineAgenticWorkflow(
  ${JSON.stringify(
    {
      name: "Test Workflow",
      timeOutInSeconds: 60,
      databaseAccessDefinitions: {
        mode: "custom",
        tablePermissions: {
          users: { select: true, insert: true, update: true },
        },
      },
      toolDefinitions: {
        fetch_webpage: {
          mcpServerName: "fetch",
          toolNames: ["fetch"],
        },
      },
      agentDefinitions: {
        researcher: {
          prompt: "You are a research assistant. ",
          modelName: "anthropic/claude-sonnet-4",
          outputSchema: {
            summary: "string",
            references: { arrayOfType: { url: "string", title: "string" } },
          },
        },
      },
    },
    null,
    2,
  )},
  async ({ researcher }, dbHandler) => {
    await dbHandler.insert("users", [{ username: "Prostgles", type: "from-agent" }]);
    const start = Date.now();
    dbHandler.find("users").then(users => {
      users.forEach(async (user) => {
        const result = await researcher("Prostgles"); 
        const sinceStart = Date.now() - start;
        dbHandler.update("users", { id: user.id }, { username: user.username + " "  + sinceStart + " " + result.summary });
      })
    })
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
