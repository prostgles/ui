import type { DBSSchema } from "@common/publishUtils";

export const dbsConnectionOptions = {
  table_options: {
    alerts: {
      label: "Alerts",
      icon: "BellBadgeOutline",
    },
    users: {
      label: "Users",
      icon: "Account",
    },
    backups: {
      label: "Backups",
      icon: "DatabaseSync",
    },
    sessions: {
      label: "Sessions",
      icon: "Laptop",
    },
    llm_chats_allowed_mcp_tools: {
      label: "Allowed MCP Tools",
      icon: "Tools",
    },
    llm_chats_allowed_functions: {
      label: "Allowed Functions",
      icon: "LanguageTypescript",
    },
    mcp_server_tools: {
      label: "MCP Tools",
      icon: "Tools",
      card: {
        headerColumn: "name",
      },
    },
    mcp_server_tool_calls: {
      label: "MCP Tool Calls",
      icon: "WrenchClock",
    },
    llm_chats: {
      label: "LLM Chats",
      icon: "Assistant",
      columns: {
        db_schema_permissions: {
          icon: "DatabaseEye",
        },
        db_data_permissions: {
          icon: "TableEye",
        },
      },
    },
    llm_models: {
      label: "LLM Models",
      icon: "Atom",
    },
    llm_providers: {
      label: "LLM Providers",
      icon: "CloudKeyOutline",
      rowIconColumn: "logo_url",
    },
    llm_prompts: {
      label: "LLM Prompts",
      icon: "MessageCogOutline",
    },
    workspaces: {
      label: "Workspaces",
      icon: "ViewGrid",
    },
    connections: {
      label: "Connections",
      icon: "Database",
    },
    magic_links: {
      label: "Magic Links",
      icon: "Link",
    },
    llm_messages: {
      label: "LLM Messages",
      icon: "MessageReplyTextOutline",
    },
    access_control: {
      label: "Access Control",
      icon: "AccountMultiple",
    },
    global_settings: {
      label: "Global Settings",
      icon: "ServerSecurity",
    },
    published_methods: {
      label: "Published Methods",
      icon: "LanguageTypescript",
    },
    login_attempts: {
      icon: "LockCheck",
      label: "Login Attempts",
    },
    mcp_servers: {
      icon: "Server",
      label: "MCP Servers",
    },
  } satisfies Partial<{
    [tableKey in keyof DBSSchema]: {
      icon: string;
      rowIconColumn?: string;
      label: string;
      card?: {
        headerColumn?: string;
      };
      columns?: Partial<Record<keyof DBSSchema[tableKey], { icon?: string }>>;
    };
  }>, //satisfies DBSSchema["connections"]["table_options"]
};
