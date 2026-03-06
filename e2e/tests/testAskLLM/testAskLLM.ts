import { join } from "path";
import {
  prostglesUICryptoDashboardSample,
  prostglesUIFoodDeliveryDashboardSample,
} from "./sampleToolUseData";
import { dockerWeatherToolUse } from "./sampleToolUseData";
import { createComponentToolUse } from "./createComponentToolUse";
import { stringify, type ToolUse } from "./utils";
import { agenticWorkflowToolUses, research } from "./agenticWorkflowToolUses";
import type { DBGeneratedSchema } from "../../../common/DBGeneratedSchema";
import type { JSONB } from "prostgles-types";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "../../../common/prostglesMcp";

export const clientNodeModulesDirectory = join(
  __dirname,
  "../../../client/node_modules",
);

type DatabaseAccessPermission = JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
>;

const taskToolArguments = {
  suggested_prompt:
    "I will paste receipt images in this chat. Please extract the following information from each receipt:\n- Company/merchant name\n- Total amount\n- Currency\n- Date of purchase\n- Full extracted text\n\nAfter extracting the data, insert it into the receipts table.",
  suggested_database_access: {
    mode: "custom",
    tablePermissions: {
      receipts: {
        select: true,
        insert: true,
        update: true,
      },
    },
  },
  suggested_database_tool_names: [],
  suggested_mcp_tool_names: ["fetch--fetch"],
} satisfies DatabaseAccessPermission;

const taskToolUse: ToolUse = {
  content:
    "Based on your requirements, I suggest the following prompt and database access settings to help you get started effectively.",
  tool: [
    {
      id: "task-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_tools_and_prompt",
        arguments: stringify(taskToolArguments),
      },
    },
  ],
};

const webSearchToolUse: ToolUse = {
  content: `To provide you with the most accurate and up-to-date information, I'll use the web search tool to look up recent data related to your query.`,
  tool: [
    {
      id: "websearch-tool-use",
      type: "function",
      function: {
        name: "websearch--websearch",
        arguments: stringify({
          q: '"prostgles websearch"',
        }),
      },
    },
    /** Must ensure parallel requests work */
    {
      id: "websearch-tool-use2",
      type: "function",
      function: {
        name: "websearch--websearch",
        arguments: stringify({
          q: '"prostgles docs"',
        }),
      },
    },
    {
      id: "websearch-tool-use-snapshot",
      type: "function",
      function: {
        name: "websearch--get_snapshot",
        arguments: stringify({
          url: "http://127.0.0.1:3004/login",
        }),
      },
    },
    {
      id: "websearch-tool-use-snapshot",
      type: "function",
      function: {
        name: "websearch--get_snapshot",
        arguments: stringify({
          url: "http://127.0.0.1:3004/manifest.json",
        }),
      },
    },
  ],
  result_content: `Search done.`,
};

const dashboardToolUse: ToolUse = {
  content: `I analyzed your schema. Let me suggest several workspaces that would provide valuable insights.`,
  tool: [
    {
      id: "dashboard-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_dashboards",
        arguments: stringify(prostglesUIFoodDeliveryDashboardSample),
      },
    },
  ],
};
const cryptoDashboardToolUse: ToolUse = {
  content: `I analyzed your schema. Let me suggest several workspaces that would provide valuable insights.`,
  tool: [
    {
      id: "dashboard-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_dashboards",
        arguments: stringify(prostglesUICryptoDashboardSample),
      },
    },
  ],
};

const mcpToolUse: ToolUse = {
  content: `To assist you further, I'll use the fetch tool to access the  application.`,
  tool: [
    {
      id: "mcp-tool-use",
      type: "function",
      function: {
        name: "fetch--fetch",
        arguments: stringify({
          url: "http://localhost:3004/login",
        }),
      },
    },
  ],
  result_content: `I've successfully fetched the login page of the application. Let me know if you need any specific information or actions performed on this page.`,
};
const playwrightMCPToolUse: ToolUse = {
  content: `I'll use Playwright to navigate to the login page and take a snapshot of it. This will help us verify that the page loads correctly and looks as expected.`,
  tool: [
    {
      id: "mcp-tool-use-playwright1",
      type: "function",
      function: {
        name: "playwright--browser_navigate",
        arguments: stringify({
          url: "http://localhost:3004/login",
        }),
      },
    },
    {
      id: "mcp-tool-use-playwright2",
      type: "function",
      function: {
        name: "playwright--browser_snapshot",
        arguments: stringify({
          url: "http://localhost:3004/login",
        }),
      },
    },
  ],
};
const isDocker = Boolean(process.env.IS_DOCKER);
const mcpSandboxToolUse: ToolUse = {
  content: `I'll create a container that runs a simple Node.js application.`,
  tool: [
    {
      id: "mcp-tool-use-sandbox1",
      type: "function",
      function: {
        name: "prostgles-ui--run_code_in_sandbox",
        arguments: stringify({
          files: {
            Dockerfile: `FROM node:20 \nWORKDIR /app \nCOPY . . \nRUN npm install \nCMD ["npm", "start"]`,
            "package.json": JSON.stringify({
              name: "test-app",
              version: "1.0.0",
              scripts: {
                start: "node index.js",
              },
              depenencies: {
                "node-fetch": "^3.3.0",
              },
            }),
            "index.js": dedent(`
            fetch(
              process.env.DOCKER_MCP_ENDPOINT + "/db/execute_sql_with_rollback", 
              { headers: { "Content-Type": "application/json" }, 
              method: "POST", 
              body: JSON.stringify({ sql: "SELECT * FROM users" }) 
            }).then(res => res.json()).then(console.log).catch(console.error);`),
          },
          networkMode: "bridge",
          timeout: 30_000,
        }),
      },
    },
  ],
};

const toolResponses: Record<string, ToolUse> = {
  task: taskToolUse,
  dashboards: dashboardToolUse,
  funding: cryptoDashboardToolUse,
  mcp: mcpToolUse,
  mcpfail: {
    content: "Hmm, the fetch tool encountered an error. Let's try again...",
    tool: mcpToolUse.tool.map((t) => ({
      ...t,
      function: { ...t.function, name: "fetch--invalidfetch" },
    })),
    duration: 1000,
    result_content: "... let's retry the failed tool",
  },
  mcpplaywright: playwrightMCPToolUse,
  mcpsandbox: mcpSandboxToolUse,
  parallel_calls: {
    content: "I'll fetch in parallel ",
    tool: [mcpToolUse.tool[0], mcpToolUse.tool[0], mcpToolUse.tool[0]].map(
      (t, i) => ({
        ...t,
        id: t.id + "_" + (i + 1),
      }),
    ),
    duration: 2000,
    result_content: "Fetched in parallel successfully",
  },
  websearch: webSearchToolUse,
  weather: {
    content:
      "I'll create a container with a script that fetches real historical weather data from a free API source.",
    tool: [
      {
        id: "weather-tool-use",
        type: "function",
        function: {
          name: "prostgles-ui--run_code_in_sandbox",
          arguments: stringify(dockerWeatherToolUse),
        },
      },
    ],
    result_content:
      "The container has fetched the historical weather data for London for the last 4 years.",
  },
  last: {
    content:
      "To get the information you need, I'll run a SQL query against your database to fetch the relevant data.",
    tool: [
      {
        id: "sql-tool-use",
        type: "function",
        function: {
          name: "prostgles-db--execute_sql_with_rollback",
          arguments: stringify({
            sql: "SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '30 days';",
          }),
        },
      },
    ],
    result_content:
      "Here is the list of orders from the last 30 days that you requested:  \n\n- OrderID: 101, Customer: John Doe, Amount: $250.00, Date: 2025-09-10 \n- OrderID: 102, Customer: Jane Smith, Amount: $150.00, Date: 2025-09-11",
  },
  receipt: {
    content:
      "Great! I've extracted the text from the receipt image. Now, I'll insert the relevant details into the receipts table in your database.",
    tool: [
      {
        id: "db-tool-use",
        type: "function",
        function: {
          name: "prostgles-db--insert",
          arguments: stringify({
            tableName: "receipts",
            data: [
              {
                extracted_text: "Item1 $10.00\nItem2 $15.00\nTotal $25.00",
                amount: 450,
                currency: "USD",
                company: "Grand Ocean Hotel",
                date: "2025-09-12",
                created_at: new Date().toISOString(),
              },
            ],
          }),
        },
      },
    ],
    result_content:
      "Inserted receipt data for Item1 $10.00, Item2 $15.00, Total $25.00 into the receipts table at Grand Ocean Hotel.",
  },
  estimated_cost: {
    tool: [
      {
        id: "filesystem-tool-use",
        type: "function",
        function: {
          name: "filesystem--directory_tree",
          arguments: stringify({
            path: clientNodeModulesDirectory,
          }),
        },
      },
    ],
  },
  request_tool_access: {
    tool: [
      {
        id: "request-tool-access-use",
        type: "function",
        function: {
          name: "prostgles-ui--request_tool_access",
          arguments: stringify({
            mcpServerTools: {
              websearch: { websearch: 1 },
            },
            databaseAccess: {
              mode: "custom",
              tablePermissions: {
                receipts: {
                  select: true,
                },
              },
            },
            reason:
              "I need to fetch data from an external API to provide you with accurate information.",
          }),
        },
      },
    ],
  },
  component: createComponentToolUse,
  agentic_workflow: agenticWorkflowToolUses.input,
  agentic_workflow_noinput: agenticWorkflowToolUses.noinput,
  agentic_workflow_clashing: agenticWorkflowToolUses.clashing,
  agentic_workflow_invalidTable: agenticWorkflowToolUses.invalidTable,
  agentic_workflow_invalidPermissionTable:
    agenticWorkflowToolUses.invalidPermissionTable,
  [research]: {
    tool: [
      {
        id: "agentic-workflow-tool-use",
        type: "function",
        function: {
          name: "agent_goal_reached",
          arguments: stringify({
            summary: "here is the summary",
            references: [
              { url: "ref1", title: "" },
              { url: "ref2", title: "" },
            ],
          }),
        },
      },
    ],
  },
  ask_tool: {
    content: "I'll ask you a question using the ask_user_questions tool.",
    tool: [
      {
        id: "ask-tool-use",
        type: "function",
        function: {
          name: "prostgles-ui--ask_user_questions",
          arguments: stringify({
            questions: [
              {
                type: "choice",
                question: "What is your favorite color?",
                allowMultipleChoices: false,
                suggestedAnswers: ["Red", "Blue", "Green", "Yellow"],
              },
              {
                type: "choice",
                question: "What is my favorite color?",
                allowMultipleChoices: true,
                suggestedAnswers: ["Red", "Blue", "Green", "Yellow"],
              },
              {
                type: "table-columns",
                tableName: "users",
                question: "Table columns",
              },
              {
                type: "table-name",
                question: "Table name",
              },
              {
                type: "free-text",
                question: "Free text",
              },
            ],
          }),
        },
      },
    ],
  },
};

export const testAskLLMCode = `

const toolResponses = ${stringify(toolResponses)};

const lastMsg = args.messages.at(-1);
const lastMsgText = lastMsg?.content?.[0]?.type === "image_url"? " receipt " : lastMsg?.content?.[0]?.text;
const { tool_call_id, is_error } = lastMsg ?? {};
const toolCallKeyResult = typeof tool_call_id === "string"? tool_call_id.split("#")[0] : undefined;
const toolResult = toolCallKeyResult && toolResponses[toolCallKeyResult];
const failedToolResult = toolCallKeyResult === "mcpfail";// typeof lastMsg.tool_call_id === "string" && lastMsg.tool_call_id.includes("fetch--invalidfetch");
const msg = failedToolResult ? " mcpfail " : lastMsgText;

const toolResponseKey = Object.keys(toolResponses).find(k => msg && msg.includes(" " + k + " ")); 
const toolResponse = toolResponses[toolResponseKey];

const defaultContent = !msg && !failedToolResult? undefined : ("free ai assistant" + (msg ?? " empty message") + (failedToolResult ? "... let's retry the failed tool" : ""));
const content = is_error? "Tool call failed. Will not retry" : toolResult?.result_content ?? toolResponse?.content ?? defaultContent;
const tool_calls = toolResponse?.tool.map(tc => ({ ...tc, id: [toolResponseKey + "#", tc.id, tc["function"].name, Math.random(), Date.now()].join("_") })); 

const duration = toolResponse?.duration ?? (3000 + Math.random() * 2000);
await new Promise(res => setTimeout(res, duration));

const choicesItem = { 
  type: "text", 
  message: {
    content,
    tool_calls 
  }
};

return { 
  choices: [
    choicesItem
  ],
  type: "Anthropic",
  usage: {
    completion_tokens: msg === "cost"? 1e5 : 0, 
    prompt_tokens: msg === "cost"? 1e5 : 0, 
    total_tokens: 0, 
  },
};//`;

function dedent(str: string) {
  const lines = str.replace(/^\n/, "").split("\n");
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim().length > 0)
      .map((line) => line.match(/^(\s*)/)![1].length),
  );
  return lines.map((line) => line.slice(indent)).join("\n");
}
