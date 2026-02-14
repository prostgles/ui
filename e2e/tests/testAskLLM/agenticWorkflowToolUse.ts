import { stringify, type ToolUse } from "./utils";
import { GeneratedFunctionSchema } from "../../../common/DBGeneratedSchema";
type UserInput = NonNullable<
  Parameters<GeneratedFunctionSchema["startAgenticWorkflow"]>[0]["userInput"]
>;

export const research = "research" as const;
const getFunc = (withUserInputArgs = true) => `
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
            summary: { type: "string" },
            references: {
              arrayOfType: {
                url: { type: "string" },
                title: { type: "string" },
              },
            },
          },
        },
      },
      userInput:
        !withUserInputArgs ? undefined : (
          ({
            "table-filter": {
              title: "Users filter",
              type: "table-filter",
              tableName: "users",
            },
            custom: {
              title: "Sort column",
              type: "custom",
              dataType: "string",
            },
            "table-name": {
              title: "Table name",
              type: "table-name",
            },
            "table-column": {
              title: "Table column",
              type: "table-column",
              tableName: "users",
            },
            "table-and-column": {
              title: "Table and column",
              type: "table-and-column",
            },
          } satisfies Record<UserInput[string]["type"], UserInput[string]>)
        ),
    },
    null,
    2,
  )},
  async ({ researcher }, dbHandler, userInputValue) => {
    await dbHandler.insert("users", [{ username: "Prostgles", type: "from-agent" }]);
    const start = Date.now();
    const filterCount = ${!withUserInputArgs ? "undefined;//" : ""} await dbHandler.count("users", userInputValue["table-filter"]);
    console.log("Filter count:", filterCount);
    dbHandler.find("users").then(users => {
      users.forEach(async (user) => {
        const result = await researcher(" ${research} Prostgles"); 
        const sinceStart = Date.now() - start;
        await dbHandler.update("users", { id: user.id }, { username: user.username + " "  + sinceStart + " " + result.summary });
      })
    })
  },
);
`;
const workflow_function_definition = getFunc();
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
export const agenticWorkflowToolUseNoUserInput: ToolUse = {
  content:
    "Based on your requirements, I suggest the following agentic workflow.",
  tool: [
    {
      id: "agentic-workflow-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_agentic_workflow",
        arguments: stringify({ workflow_function_definition: getFunc(false) }),
      },
    },
  ],
};
