import { fixIndent } from "../../../demo/sqlVideoDemo";
import { getCommandElemSelector } from "../../../Testing";
import type { UIDocElement } from "../../UIDocs";

export const AIAssistantUIDoc = {
  type: "popup",
  selectorCommand: "AskLLM",
  title: "AI Assistant",
  description:
    "Opens an AI assistant to help generate SQL queries, understand database schema, or perform other tasks.",
  docs: fixIndent(`
    The AI assistant is an intelligent companion that helps you work more efficiently with your PostgreSQL databases. 
    It can generate SQL queries, explain database schemas, analyze data patterns, and assist with various database-related tasks through a conversational interface.
    MCP Servers can be used to extend the AI capabilities with custom tools and integrations.

    <img src="/screenshots/ai_assistant.svg" alt="AI assistant popup screenshot" />
 
    Supported AI Providers: OpenAI, Anthropic, Google Gemini, OpenRouter, and Local Models. 

    *Note: AI providers are configured by administrators in Server Settings > LLM Providers*
  `),
  asSeparateFile: true,
  children: [
    {
      type: "section",
      title: "Header actions",
      description: "Actions available in the header of the AI assistant popup.",
      selector: getCommandElemSelector("Popup.header"),
      children: [
        {
          type: "smartform-popup",
          selector: getCommandElemSelector("LLMChatOptions.toggle"),
          title: "Chat settings",
          tableName: "llm_chats",
          description:
            "Allows editing all chat settings and data as well deleting or cloning the current chat.",
        },
        {
          type: "input",
          inputType: "select",
          selector: getCommandElemSelector("LLMChat.select"),
          title: "Select chat",
          description:
            "Selects a chat from the list of available chats. Each chat represents a separate conversation with the AI assistant.",
        },
        {
          type: "button",
          selector: getCommandElemSelector("AskLLMChat.NewChat"),
          title: "New chat",
          description: "Creates a new chat with the AI assistant.",
        },
        {
          type: "button",
          selector: getCommandElemSelector("Popup.toggleFullscreen"),
          title: "Toggle fullscreen",
          description:
            "Toggles the fullscreen mode for the AI assistant popup.",
        },
        {
          type: "button",
          selector: getCommandElemSelector("Popup.close"),
          title: "Close popup",
          description: "Closes the AI assistant popup.",
        },
      ],
    },
    {
      type: "list",
      title: "Chat messages",
      description: "List of messages in the current chat.",
      selector: getCommandElemSelector("Chat.messageList"),
      itemContent: [],
      itemSelector: getCommandElemSelector("Chat.messageList") + " > .message",
    },
    {
      type: "section",
      title: "Message input",
      description:
        "Input field for entering messages to the AI assistant and quick actions.",
      docs: fixIndent(`
        The message input area allows you to write text, attach files and control other aspects of the AI assistant (change model, add/remove tools, speech to text). 

      `),
      selector: getCommandElemSelector("Chat.sendWrapper"),
      children: [
        {
          type: "input",
          inputType: "text",
          title: "Message input",
          description: "Input field for entering messages to the AI assistant.",
          selector: getCommandElemSelector("Chat.textarea"),
        },
        {
          type: "button",
          title: "Send message",
          description: "Sends the entered message to the AI assistant.",
          selector: getCommandElemSelector("Chat.send"),
        },
        {
          type: "popup",
          title: "MCP tools allowed",
          description: "Opens the MCP tools menu for the current chat.",
          selector: getCommandElemSelector("LLMChatOptions.MCPTools"),
          children: [
            {
              type: "popup",
              selector: getCommandElemSelector("AddMCPServer.Open"),
              title: "Add MCP server",
              description:
                "Opens the form to add a new MCP server for the current chat.",
              children: [
                {
                  type: "input",
                  inputType: "text",
                  title: "MCP tool json config",
                  description:
                    "JSON configuration for the MCP tool to be added.",
                  selector:
                    getCommandElemSelector("AddMCPServer") +
                    " " +
                    getCommandElemSelector("MonacoEditor"),
                },
                {
                  type: "button",
                  title: "Add MCP server",
                  description:
                    "Adds the specified MCP server to the current chat.",
                  selector: getCommandElemSelector("AddMCPServer.Add"),
                },
              ],
            },
            {
              type: "button",
              title: "Stop/Start all MCP Servers",
              description: "Quick way to stop/restart all MCP servers.",
              selector: getCommandElemSelector(
                "MCPServersToolbar.stopAllToggle",
              ),
            },
            {
              type: "button",
              title: "Search tools",
              description:
                "Searches for specific MCP tools in the list of available tools.",
              selector: getCommandElemSelector("MCPServersToolbar.searchTools"),
            },
            {
              type: "list",
              title: "MCP tools",
              description:
                "List of available MCP tools. To allow a tool to be used in the current chat it must be ticked. Each tool represents a specific functionality or integration.",
              selector:
                getCommandElemSelector("LLMChatOptions.MCPTools") +
                " " +
                getCommandElemSelector("SmartCardList"),
              itemSelector: ".SmartCard",
              itemContent: [
                {
                  type: "text",
                  title: "MCP server name",
                  description:
                    "Name of the parent MCP server associated with the tool.",
                  selector: "div",
                },
                {
                  type: "list",
                  title: "MCP server tools",
                  description:
                    "List of available tools for the selected MCP server. Click to enable or disable a specific tool for the current chat.",
                  selector: getCommandElemSelector("MCPServerTools"),
                  itemSelector: ".SmartCard",
                  itemContent: [],
                },
                {
                  type: "popup",
                  title: "MCP Server Logs",
                  description:
                    "Opens the logs for the selected MCP server, allowing you to view its activity and status.",
                  selector: getCommandElemSelector(
                    "MCPServerFooterActions.logs",
                  ),
                  children: [],
                },
                {
                  type: "popup",
                  title: "MCP Server Config",
                  description:
                    "Opens the configuration for the selected MCP server, allowing you to manage its settings.",
                  selector: getCommandElemSelector("MCPServerConfigButton"),
                  children: [
                    {
                      type: "button",
                      title: "Save config",
                      description:
                        "Saves the configuration for the selected MCP server.",
                      selector: getCommandElemSelector("MCPServerConfig.save"),
                    },
                  ],
                },
                {
                  type: "button",
                  title: "Reload MCP tools",
                  description:
                    "Reloads the MCP tools for the selected MCP server, updating the list of available tools.",
                  selectorCommand: "MCPServerFooterActions.refreshTools",
                },
                {
                  type: "button",
                  title: "Enable/Disable MCP server",
                  description:
                    "Enables or disables the selected MCP server for all chats. If configuration is required a popup will be shown.",
                  selector: getCommandElemSelector(
                    "MCPServerFooterActions.enableToggle",
                  ),
                },
              ],
            },
          ],
        },
        {
          type: "smartform-popup",
          selector: getCommandElemSelector("LLMChatOptions.DatabaseAccess"),
          title: "Database access",
          description:
            "Opens the database access settings for the current chat. This controls how the AI assistant can interact with the current database.",
          tableName: "llm_chats",
          fieldNames: ["db_data_permissions", "db_schema_permissions"],
        },
        {
          type: "popup",
          title: "Prompt Selector",
          description:
            "Opens the prompt details for the current chat, allowing you to manage the prompt template and other related settings.",
          selector: getCommandElemSelector("LLMChatOptions.Prompt"),
          children: [],
        },
        {
          type: "select",
          title: "LLM Model",
          description:
            "Selects the LLM model to be used for the current chat. Different models may have different capabilities and performance.",
          selector: getCommandElemSelector("LLMChatOptions.Model"),
        },
      ],
    },
  ],
} satisfies UIDocElement;
