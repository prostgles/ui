<h1 id="ai_assistant"> AI Assistant </h1> 

The AI assistant is an intelligent companion that helps you work more efficiently with your PostgreSQL databases. 
It can generate SQL queries, explain database schemas, analyze data patterns, and assist with various database-related tasks through a conversational interface.
MCP Servers can be used to extend the AI capabilities with custom tools and integrations.

<picture>
<source srcset="/screenshots/dark/ai_assistant_01.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/ai_assistant_01.svg" alt="AI assistant popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>
<picture>
<source srcset="/screenshots/dark/ai_assistant_dashboards_02.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/ai_assistant_dashboards_02.svg" alt="AI assistant popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>
<picture>
<source srcset="/screenshots/dark/ai_assistant_mcp_03.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/ai_assistant_mcp_03.svg" alt="AI assistant popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>
<picture>
<source srcset="/screenshots/dark/ai_assistant_tasks_04.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/ai_assistant_tasks_04.svg" alt="AI assistant popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>
<picture>
<source srcset="/screenshots/dark/ai_assistant_docker_05.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/ai_assistant_docker_05.svg" alt="AI assistant popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

Supported AI Providers: OpenAI, Anthropic, Google Gemini, OpenRouter, and Local Models. 

*Note: AI providers are configured by administrators in Server Settings > LLM Providers*

  - **Header actions**: Actions available in the header of the AI assistant popup.  
    - **Chat settings**: Allows editing all chat settings and data as well deleting or cloning the current chat.  
    - **Select chat**: Selects a chat from the list of available chats. Each chat represents a separate conversation with the AI assistant.  
    - **New chat**: Creates a new chat with the AI assistant.  
    - **Toggle fullscreen**: Toggles the fullscreen mode for the AI assistant popup.  
    - **Close popup**: Closes the AI assistant popup.  
  - **Chat messages**: List of messages in the current chat.  
  - <a href="#message_input">Message input</a>: Input field for entering messages to the AI assistant and quick actions.  

<h3 id="message_input"> Message input </h3> 

The message input area allows you to write text, attach files and control other aspects of the AI assistant (change model, add/remove tools, speech to text).

  - **Message input**: Input field for entering messages to the AI assistant.  
  - **Send message**: Sends the entered message to the AI assistant.  
  - **MCP tools allowed**: Opens the MCP tools menu for the current chat.  
    - **Add MCP server**: Opens the form to add a new MCP server for the current chat.  
      - **MCP tool json config**: JSON configuration for the MCP tool to be added.  
      - **Add MCP server**: Adds the specified MCP server to the current chat.  
    - **Stop/Start all MCP Servers**: Quick way to stop/restart all MCP servers.  
    - **Search tools**: Searches for specific MCP tools in the list of available tools.  
    - **MCP tools**: List of available MCP tools. To allow a tool to be used in the current chat it must be ticked. Each tool represents a specific functionality or integration.  
      - **MCP server name**: Name of the parent MCP server associated with the tool.  
      - **MCP server tools**: List of available tools for the selected MCP server. Click to enable or disable a specific tool for the current chat.  
      - **MCP Server Logs**: Opens the logs for the selected MCP server, allowing you to view its activity and status.  
      - **MCP Server Config**: Opens the configuration for the selected MCP server, allowing you to manage its settings.  
        - **Save config**: Saves the configuration for the selected MCP server.  
      - **Reload MCP tools**: Reloads the MCP tools for the selected MCP server, updating the list of available tools.  
      - **Enable/Disable MCP server**: Enables or disables the selected MCP server for all chats. If configuration is required a popup will be shown.  
  - **Database access**: Opens the database access settings for the current chat. This controls how the AI assistant can interact with the current database.  
  - **Prompt Selector**: Opens the prompt details for the current chat, allowing you to manage the prompt template and other related settings.  
  - **LLM Model**: Selects the LLM model to be used for the current chat. Different models may have different capabilities and performance.  

