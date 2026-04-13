import { getProstglesMCPFullToolName } from "common/mcpUtils";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "common/prostglesMcp";
import type { DBSSchema } from "common/publishUtils";
import { join } from "path";
import type { JSONB } from "prostgles-types";
import { runDbsSql, type PageWIds } from "utils/utils";
import { agenticWorkflowToolUses, research } from "./agenticWorkflowToolUses";
import { createComponentToolUse } from "./createComponentToolUse";
import { getAskUserToolUse } from "./getAskUserToolUse";
import { mcpSandboxToolUse } from "./mcpSandboxToolUse";
import {
  dockerWeatherToolUse,
  prostglesUICryptoDashboardSample,
  prostglesUIFoodDeliveryDashboardSample,
} from "./sampleToolUseData";
import { receiptImport } from "./scenarios/receiptImport/receiptImport.scenario";
import { stringify } from "./stringify";
import { type Scenario, type ToolUse } from "./utils";

type RequestToolAccess = JSONB.GetType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["request_tool_access"]["schema"]
>;

export const clientNodeModulesDirectory = join(
  __dirname,
  "../../../client/node_modules",
);

const requestToolAccessArgs = {
  reason:
    "I need to fetch data from an external API to provide you with accurate information.",
  databaseAccess: {
    receipts: {
      select: true,
      insert: true,
      update: true,
    },
  },
  mcpServerTools: {
    web: { fetch: 1 },
  },
} satisfies RequestToolAccess;

const taskToolUse: ToolUse = {
  content:
    "Based on your requirements, I suggest the following prompt and database access settings to help you get started effectively.",
  tool: [
    {
      id: "task-tool-use",
      type: "function",
      function: {
        name: getProstglesMCPFullToolName(
          "prostgles-ui",
          "request_tool_access",
        ),
        arguments: stringify(requestToolAccessArgs),
      },
    },
  ],
  result_content:
    "Added fetch tool access and database permissions for receipts table.",
};

const webSearchToolUse: ToolUse = {
  content: `To provide you with the most accurate and up-to-date information, I'll use the web search tool to look up recent data related to your query.`,
  tool: [
    {
      id: "web-tool-use",
      type: "function",
      function: {
        name: getProstglesMCPFullToolName("web", "websearch"),
        arguments: stringify({
          q: '"prostgles websearch"',
        }),
      },
    },
    /** Must ensure parallel requests work */
    {
      id: "web-tool-use2",
      type: "function",
      function: {
        name: getProstglesMCPFullToolName("web", "websearch"),
        arguments: stringify({
          q: '"prostgles docs"',
        }),
      },
    },
    {
      id: "web-tool-use-snapshot",
      type: "function",
      function: {
        name: getProstglesMCPFullToolName("web", "get_snapshot"),
        arguments: stringify({
          url: "http://127.0.0.1:3004/login",
        }),
      },
    },
    {
      id: "web-tool-use-snapshot",
      type: "function",
      function: {
        name: getProstglesMCPFullToolName("web", "get_snapshot"),
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
        name: getProstglesMCPFullToolName("prostgles-ui", "create_dashboards"),
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
        name: getProstglesMCPFullToolName("prostgles-ui", "create_dashboards"),
        arguments: stringify(prostglesUICryptoDashboardSample),
      },
    },
  ],
};

const mcpFetchToolUse: ToolUse = {
  content: `To assist you further, I'll use the fetch tool to access the  application.`,
  tool: [
    {
      id: "mcp-tool-use",
      type: "function",
      function: {
        name: "web--fetch",
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

const scenarios: Record<string, Scenario> = {};
Object.values([receiptImport]).forEach(({ firstMessage, steps }) => {
  if (scenarios[firstMessage]) {
    throw new Error(`Duplicate scenario firstMessage: ${firstMessage}`);
  }
  scenarios[firstMessage] = { firstMessage, steps };
});

const toolResponses: Record<string, ToolUse> = {
  OCR: {
    tool: [
      {
        id: "ocr-tool-use",
        type: "function",
        function: {
          name: "agent_goal_reached",
          arguments: stringify({
            vendor_name: "Grand Ocean Hotel",
            purchase_date: "2025-09-10",
            currency_code: "USD",
            subtotal: 450,
            tax_amount: 0,
            total_amount: 450,
            receipt_number: "RCPT-20250911-001",
            confidence: 0.95,
          }),
        },
      },
    ],
  },
  task: taskToolUse,
  get_tool_schemas: {
    tool: [
      {
        id: "get-tool-schemas-use",
        type: "function",
        function: {
          name: getProstglesMCPFullToolName("prostgles-ui", "get_tool_schemas"),
          arguments: stringify({ mcpServerTools: { web: { fetch: 1 } } }),
        },
      },
    ],
    content: `Here are the available tools and their input schemas.`,
    result_content: "Fetched tool schemas successfully.",
  },
  dashboards: dashboardToolUse,
  funding: cryptoDashboardToolUse,
  mcp: mcpFetchToolUse,
  mcpfail: {
    content: "Hmm, the fetch tool encountered an error. Let's try again...",
    tool: mcpFetchToolUse.tool.map((t) => ({
      ...t,
      function: { ...t.function, name: "web--invalidfetch" },
    })),
    duration: 1000,
    result_content: "... let's retry the failed tool",
  },
  mcpplaywright: playwrightMCPToolUse,
  mcpsandbox: mcpSandboxToolUse,
  parallel_calls: {
    content: "I'll fetch in parallel ",
    tool: [
      mcpFetchToolUse.tool[0],
      mcpFetchToolUse.tool[0],
      mcpFetchToolUse.tool[0],
    ].map((t, i) => ({
      ...t,
      id: t.id + "_" + (i + 1),
    })),
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
          name: getProstglesMCPFullToolName(
            "prostgles-ui",
            "run_code_in_sandbox",
          ),
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
          name: getProstglesMCPFullToolName("db", "execute_readonly_sql"),
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
          name: getProstglesMCPFullToolName("db", "insert"),
          arguments: stringify({
            tableName: "receipts",
            data: {
              extracted_text: "Item1 $10.00\nItem2 $15.00\nTotal $25.00",
              amount: 450,
              currency: "USD",
              company: "Grand Ocean Hotel",
              date: "2025-09-12",
              created_at: new Date().toISOString(),
            },
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
          name: getProstglesMCPFullToolName(
            "prostgles-ui",
            "request_tool_access",
          ),
          arguments: stringify({
            mcpServerTools: {
              web: { websearch: 1 },
            },
            databaseAccess: {
              receipts: {
                select: true,
              },
            },
            reason:
              "I need to fetch data from an external API to provide you with accurate information.",
          }),
        },
      },
    ],
    result_content:
      "Requested access to websearch tool and read access to receipts table in the database.",
  },
  component: createComponentToolUse,
  agentic_workflow: agenticWorkflowToolUses.input,
  agentic_workflow_noinput: agenticWorkflowToolUses.noinput,
  agentic_workflow_filesystem: agenticWorkflowToolUses.filesystem,
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
    ...getAskUserToolUse(true),
  },
  ask_tool_invalid: {
    content: " ",
    ...getAskUserToolUse(false),
  },
};

export const testAskLLMCode = `

const toolResponses = ${stringify(toolResponses)};
const scenarios = ${stringify(scenarios)};
const agentMessageCount = args.messages.filter(m => m.role === "assistant").length;

const firstMsgText = args.messages[1].content?.[0]?.text;
const lastMsg = args.messages.at(-1);
const lastMsgText = lastMsg?.content?.[0]?.type === "image_url"? " receipt " : lastMsg?.content?.[0]?.text;
const { tool_call_id, is_error } = lastMsg ?? {};
const toolCallKeyResult = typeof tool_call_id === "string"? tool_call_id.split("#")[0] : undefined;
const toolResult = toolCallKeyResult && toolResponses[toolCallKeyResult];
const failedToolResult = toolCallKeyResult === "mcpfail";// typeof lastMsg.tool_call_id === "string" && lastMsg.tool_call_id.includes("web--invalidfetch");
const msg = failedToolResult ? " mcpfail " : lastMsgText;

const toolResponseKey = Object.keys(toolResponses).find(k => msg && msg.includes(" " + k + " ")); 
const toolResponse = scenarios[firstMsgText]?.steps[agentMessageCount] ?? toolResponses[toolResponseKey];

const defaultContent = !msg && !failedToolResult? undefined : ("free ai assistant" + (msg ?? " empty message") + (failedToolResult ? "... let's retry the failed tool" : ""));
const content = is_error? "Tool call failed. Will not retry" : toolResult?.result_content ?? toolResponse?.content ?? defaultContent;
const tool_calls = toolResponse?.tool.map(tc => ({ ...tc, id: [toolResponseKey + "#", tc.id, tc["function"].name, Math.random(), Date.now()].join("_") })); 

const duration = toolResponse?.duration ?? (3000 + Math.random() * 2000);
await new Promise(res => setTimeout(res, duration));

const choicesItem = { 
  type: "text", 
  message: {
    content: !content && !tool_calls?.length?  [{ type: "text", text: " hmmm " }] : content,
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

export const setupAskLLMToolUse = async (page: PageWIds) => {
  const existingFunc: DBSSchema["published_methods"] | undefined =
    await runDbsSql(
      page,
      `SELECT * FROM published_methods WHERE name = 'askLLM'`,
      {},
      { returnType: "row" },
    );
  if (!existingFunc) {
    throw new Error("askLLM function not found in the database");
  }
  const newDefinition = [
    `export const run: ProstglesMethod = async (args, { db, dbo, user, callMCPServerTool }) => {`,
    testAskLLMCode,
    `}`,
  ].join("\n");
  await runDbsSql(
    page,
    "UPDATE published_methods SET run = ${run} WHERE name = 'askLLM'",
    { run: newDefinition },
  );
};
