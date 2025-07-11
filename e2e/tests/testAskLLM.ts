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

const mcpToolUseArguments = stringify({
  url: "https://localhost:3004",
});
const mcpToolUse = {
  id: "mcp-tool-use",
  type: "function",
  function: {
    name: "fetch--fetch",
    arguments: mcpToolUseArguments,
  },
};

export const testAskLLMCode = `
const msg = args.messages.at(-1)?.content[0]?.text;

const toolCall = ({
  tasks: ${stringify(taskToolUse)},
  dashboards: ${stringify(dashboardToolUse)},
  mcp: ${stringify(mcpToolUse)},
})[msg];

const choicesItem = { 
  type: "text", 
  message: {
    content: "free ai assistant" + msg,
    tool_calls: toolCall? [toolCall] : undefined,
  }  
};

return { 
  completion_tokens: 0, 
  prompt_tokens: 0, 
  total_tokens: 0, 
  choices: [
    choicesItem
  ],
};//`;
