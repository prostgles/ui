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

const taskToolUse = {
  id: "task-tool-use",
  type: "function",
  function: {
    name: "prostgles-ui--suggest_tools_and_prompt",
    arguments: taskToolArguments,
  },
};

const dashboardToolArguments = stringify({
  prostglesWorkspaces: [
    {
      name: "generated workspace",
      windows: [{ type: "table" }],
      layout: { id: "root", size: 100, isRoot: true, items: [] },
    },
  ],
});
const dashboardToolUse = {
  id: "dashboard-tool-use",
  type: "function",
  function: {
    name: "prostgles-ui--suggest_dashboards",
    arguments: dashboardToolArguments,
  },
};

const mcpToolUse = {
  id: "mcp-tool-use",
  type: "function",
  function: {
    name: "fetch--fetch",
    arguments: stringify({
      url: "http://localhost:3004/login",
    }),
  },
};
const playwrightMCPToolUse = [
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
];
const { IS_DOCKER, CI } = process.env;
const isDocker = Boolean(IS_DOCKER || CI);
const mcpSandboxToolUse = [
  {
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
];

export const testAskLLMCode = `

const lastMsg = args.messages.at(-1);
const lastMsgText = lastMsg?.content[0]?.text;
const failedToolResult = typeof lastMsg.tool_call_id === "string" && lastMsg.tool_call_id.includes("fetch--invalidfetch"));
const msg = failedToolResult ? "mcpfail" : lastMsgText;

const tool_calls = ({
  tasks: [${stringify(taskToolUse)}],
  dashboards: [${stringify(dashboardToolUse)}],
  mcp: [${stringify(mcpToolUse)}],
  mcpfail: [${stringify({ ...mcpToolUse, function: { ...mcpToolUse.function, name: "fetch--invalidfetch" } })}],
  mcpplaywright: ${stringify(playwrightMCPToolUse)},
  mcpsandbox: ${stringify(mcpSandboxToolUse)},
})[msg]?.map(tc => ({ ...tc, id: [tc.id, tc["function"].name, Math.random(), Date.now()].join("_") })); 


const choicesItem = { 
  type: "text", 
  message: {
    content: "free ai assistant" + (msg ?? " tool result received") + (failedToolResult ? "... let's retry the failed tool" : ""),
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
