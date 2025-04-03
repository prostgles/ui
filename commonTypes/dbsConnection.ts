import type { DBSSchema } from "./publishUtils";

export const dbsConnection = {
  table_options: {
    alerts: {
      icon: "BellBadgeOutline",
    },
    users: {
      icon: "Account",
    },
    backups: {
      icon: "DatabaseSync",
    },
    sessions: {
      icon: "Laptop",
    },
    llm_chats_allowed_mcp_tools: {
      icon: "Tools",
    },
    llm_chats_allowed_functions: {
      icon: "LanguageTypescript",
    },
    mcp_server_tools: {
      icon: "Tools",
    },
    mcp_server_tool_calls: {
      icon: "WrenchClock",
    },
    llm_chats: {
      icon: "Assistant",
    },
    llm_models: {
      icon: "Atom",
    },
    llm_prompts: {
      icon: "MessageCogOutline",
    },
    workspaces: {
      icon: "ViewGrid",
    },
    connections: {
      icon: "Database",
    },
    magic_links: {
      icon: "Link",
    },
    llm_messages: {
      icon: "MessageReplyTextOutline",
    },
    access_control: {
      icon: "AccountMultiple",
    },
    global_settings: {
      icon: "ServerSecurity",
    },
    published_methods: {
      icon: "LanguageTypescript",
    },
  } satisfies Partial<Record<keyof DBSSchema, { icon: string }>>,
};
