import { prostglesUIDashboardSample } from "sampleToolUseData";
import { dockerWeatherToolUse } from "sampleToolUseData";

const stringify = (obj: any) => JSON.stringify(obj, null, 2);

const taskToolArguments = stringify({
  suggested_prompt: "generated prompt",
  suggested_database_access: {
    Mode: "Custom",
    tables: [
      {
        tableName: "mytable",
        select: true,
        insert: false,
        delete: false,
        update: true,
      },
    ],
  },
  suggested_database_tool_names: ["prostgles-db-methods--askLLM"],
  suggested_mcp_tool_names: ["fetch--fetch"],
});

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
        arguments: taskToolArguments,
      },
    },
  ],
};

const dashboardToolUse: ToolUse = {
  content: `I'll analyze your schema and create some useful dashboards for what appears to be a food delivery platform. Let me suggest several workspaces that would provide valuable insights into different aspects of your business.`,
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
            "index.js": `
            fetch(
              "http://${isDocker ? "prostgles-ui-docker-mcp" : "172.17.0.1"}:3009/db/execute_sql_with_rollback", 
              { headers: { "Content-Type": "application/json" }, 
              method: "POST", 
              body: JSON.stringify({ sql: "SELECT * FROM users" }) 
            }).then(res => res.json()).then(console.log).catch(console.error);`,
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
  },
  mcpplaywright: playwrightMCPToolUse,
  mcpsandbox: mcpSandboxToolUse,
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
  },
};

export const testAskLLMCode = `

const lastMsg = args.messages.at(-1);
const lastMsgText = lastMsg?.content[0]?.text;
const failedToolResult = typeof lastMsg.tool_call_id === "string" && lastMsg.tool_call_id.includes("fetch--invalidfetch"));
const msg = failedToolResult ? " mcpfail " : lastMsgText;

const toolResponses = ${stringify(toolResponses)};
const toolResponseKey = Object.keys(toolResponses).find(k => msg && msg.includes(" " + k + " ")); 
const toolResponse = toolResponses[toolResponseKey];

const defaultContent = "free ai assistant" + (msg ?? " tool result received") + (failedToolResult ? "... let's retry the failed tool" : "");
const content = toolResponse?.content ?? defaultContent;
const tool_calls = toolResponse?.tool.map(tc => ({ ...tc, id: [tc.id, tc["function"].name, Math.random(), Date.now()].join("_") })); 


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
