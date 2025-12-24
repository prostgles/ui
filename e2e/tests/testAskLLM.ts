import { join } from "path";
import { prostglesUIDashboardSample } from "sampleToolUseData";
import { dockerWeatherToolUse } from "sampleToolUseData";

const stringify = (obj: any) => JSON.stringify(obj, null, 2);
export const clientNodeModulesDirectory = join(
  __dirname,
  "../../../../client/node_modules",
);
console.log("Client node modules dir:", clientNodeModulesDirectory);

const taskToolArguments = {
  suggested_prompt:
    "I will paste receipt images in this chat. Please extract the following information from each receipt:\n- Company/merchant name\n- Total amount\n- Currency\n- Date of purchase\n- Full extracted text\n\nAfter extracting the data, insert it into the receipts table.",
  suggested_database_access: {
    Mode: "Custom",
    tables: [
      {
        tableName: "receipts",
        select: true,
        insert: true,
        delete: false,
        update: true,
      },
    ],
  },
  suggested_database_tool_names: [],
  suggested_mcp_tool_names: ["fetch--fetch"],
};

type ToolUse = {
  content?: string;
  tool: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  duration?: number;
  result_content?: string;
};

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
  ],
  result_content: `Search done.`,
};

const dashboardToolUse: ToolUse = {
  content: `I analyzed your schema for what appears to be a food delivery platform. Let me suggest several workspaces that would provide valuable insights into different aspects of your business.`,
  tool: [
    {
      id: "dashboard-tool-use",
      type: "function",
      function: {
        name: "prostgles-ui--suggest_dashboards",
        arguments: stringify(prostglesUIDashboardSample),
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
        name: "docker-sandbox--create_container",
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
              "http://${isDocker ? "prostgles-ui-docker-mcp" : "172.17.0.1"}:3009/db/execute_sql_with_rollback", 
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
          name: "docker-sandbox--create_container",
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
  usage: {
    completion_tokens: msg === "cost"? 1e5 : 0, 
    prompt_tokens: 0, 
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
