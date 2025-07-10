const taskToolUse = {
  id: -1,
  type: "function",
  function: {
    name: "prostgles-ui--suggest_tools_and_prompt",
    arguments: {
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
    },
  },
};

const dashboardToolUse = {
  id: -1,
  type: "function",
  function: {
    name: "prostgles-ui--suggest_dashboards",
    arguments: {
      prostglesWorkspaces: [
        { name: "generated workspace", windows: [{ type: "table" }] },
      ],
    },
  },
};
const stringify = (obj: any) => JSON.stringify(obj, null, 2);
export const testAskLLMCode = `
const msg = args.messages.at(-1)?.content[0]?.text;

const toolCall = msg === "tasks"? ${stringify(taskToolUse)}
  : msg === "dashboards"? ${stringify(dashboardToolUse)}
  : undefined;

const choicesItem = { 
    type: "text", 
    message: { 
      content: "free ai assistant" + msg
    }  
  };

return { 
  completion_tokens: 0, 
  prompt_tokens: 0, 
  total_tokens: 0, 
  choices: [
    choicesItem
  ],
  tools_calls: toolCall? [toolCall] : undefined,
};//`;
