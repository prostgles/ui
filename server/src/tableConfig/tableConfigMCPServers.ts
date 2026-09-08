import type { TableConfig } from "prostgles-server";
import { type JSONB } from "prostgles-types";

export const mcpServerConfigJsonbSchema = {
  oneOfType: [
    {
      type: { enum: ["OAuth"] },
      scopes: { type: "string[]" },
      savePngIcon: "boolean",
      auth: {
        oneOfType: [
          { mode: { enum: ["none", "dcr"] } },
          {
            mode: { enum: ["cimd"] },
            clientMetadataUrl: { type: "string" },
          },
          {
            mode: { enum: ["bearer"] },
            bearerToken: { type: "string" },
          },
          {
            mode: { enum: ["authorization_code"] },
            clientId: "string",
            clientSecret: "string",
          },
          {
            mode: { enum: ["client_credentials"] },
            clientId: "string",
            clientSecret: "string",
            tokenEndpoint: "string",
          },
        ],
      },
    },
    {
      type: { enum: ["local"] },
      value: { record: { values: "unknown" } },
    },
  ],
} as const satisfies JSONB.JSONBSchema;

const commonOAuthSchema = {
  scopes: "string[]",
  discoveryState: { record: { values: "unknown" } },
  clientInformation: { record: { values: "unknown" } },
  redirectUri: "string",
} as const satisfies JSONB.ObjectType["type"];

export const tableConfigMCPServers: TableConfig<{ en: 1 }> = {
  mcp_servers: {
    columns: {
      name: `TEXT PRIMARY KEY`,
      info: `TEXT`,
      icon_path: `TEXT`,
      icon_bytes: `BYTEA`,
      headers: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: "string",
          },
        },
      },
      server_version: {
        nullable: true,
        jsonbSchemaType: {
          version: "string",
          name: "string",
          websiteUrl: { type: "string", optional: true },
          description: { type: "string", optional: true },
          icons: {
            optional: true,
            arrayOfType: {
              src: "string",
              mimeType: { type: "string", optional: true },
              sizes: { type: "string[]", optional: true },
              theme: { enum: ["light", "dark"], optional: true },
            },
          },
          title: { type: "string", optional: true },
        },
      },
      capabilities: {
        nullable: true,
        jsonbSchemaType: {
          experimental: {
            optional: true,
            record: { values: "any" },
          },
          logging: {
            optional: true,
            record: { values: "any" },
          },
          completions: {
            optional: true,
            record: { values: "any" },
          },
          prompts: {
            optional: true,
            type: {
              listChanged: { type: "boolean", optional: true },
            },
          },
          resources: {
            optional: true,
            type: {
              subscribe: { type: "boolean", optional: true },
              listChanged: { type: "boolean", optional: true },
            },
          },
          tools: {
            optional: true,
            type: {
              listChanged: { type: "boolean", optional: true },
            },
          },
          tasks: {
            optional: true,
            type: {
              list: { record: { values: "any" }, optional: true },
              cancel: { record: { values: "any" }, optional: true },
              requests: {
                optional: true,
                type: {
                  tools: {
                    optional: true,
                    type: {
                      call: { record: { values: "any" }, optional: true },
                    },
                  },
                },
              },
            },
          },
          extensions: {
            optional: true,
            record: {
              values: { record: { values: "any" } },
            },
          },
        },
      },
      source: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["github"] },
              name: "string",
              repoUrl: "string",
              installationCommands: {
                arrayOfType: {
                  command: "string",
                  args: { type: "string[]", optional: true },
                },
                optional: true,
              },
            },
            {
              type: { enum: ["code"] },
              packageJson: "string",
              tsconfigJson: "string",
              files: {
                record: { values: "string" },
              },
            },
          ],
        },
      },
      command: {
        enum: [
          "npx",
          "npm",
          "uvx",
          "uv",
          "docker",
          "prostgles-local",
          "streamable-http",
        ],
      },
      url: `TEXT`,
      cwd: `TEXT`,
      args: `TEXT[]`,
      stderr: "TEXT",
      env: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: "string",
          },
        },
      },
      env_from_main_process: `TEXT[]`,
      config_schema: {
        jsonbSchema: {
          record: {
            values: {
              oneOfType: [
                {
                  type: { enum: ["local"] },
                  renderWithComponent: {
                    enum: ["FileTree", "WebMcpConfig"],
                    optional: true,
                  },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                  defaultValue: { type: "unknown", optional: true },
                  schema: "unknown",
                },
                {
                  type: { enum: ["env"] },
                  renderWithComponent: {
                    enum: ["FileTree", "WebMcpConfig"],
                    optional: true,
                  },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                },
                {
                  type: { enum: ["arg", "...args"] },
                  renderWithComponent: {
                    enum: ["FileTree", "WebMcpConfig"],
                    optional: true,
                  },
                  title: { type: "string", optional: true },
                  optional: { type: "boolean", optional: true },
                  description: { type: "string", optional: true },
                  index: { type: "integer", optional: true },
                },
              ],
            },
          },
        },
        nullable: true,
      },
      enabled: `BOOLEAN NOT NULL DEFAULT FALSE`,
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      installed: `TIMESTAMPTZ`,
    },
  },
  mcp_server_configs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      config: { jsonbSchema: mcpServerConfigJsonbSchema },
      oauth_request_id: `TEXT UNIQUE`,
      oauth: {
        nullable: true,
        jsonbSchema: {
          oneOfType: [
            {
              phase: { enum: ["initializing_dcr"] },
              redirectUri: "string",
              scopes: "string[]",
            },
            {
              phase: { enum: ["initializing_client"] },
              tokenEndpoint: "string",
              ...commonOAuthSchema,
            },
            {
              phase: { enum: ["initializing_bearer_token"] },
              redirectUri: "string",
              bearerToken: "string",
              scopes: "string[]",
            },
            {
              phase: { enum: ["error"] },
              error: "string",
              errorType: { enum: ["dcr_not_supported", "unknown"] },
              redirectUri: "string",
              scopes: "string[]",
            },
            {
              phase: { enum: ["awaiting_authorization"] },
              ...commonOAuthSchema,
              authorizationUrl: "string",
              codeVerifier: "string",
            },
            {
              phase: { enum: ["exchanging_code"] },
              ...commonOAuthSchema,
              codeVerifier: "string",
              pendingAuthorizationCode: "string",
            },
            {
              phase: { enum: ["connected"] },
              ...commonOAuthSchema,
              tokens: { record: { values: "unknown" } },
              clientSecret: { type: "string", optional: true },
            },
            {
              phase: { enum: ["connected_bearer"] },
              bearerToken: "string",
            },
          ],
        },
      },
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      last_updated: `TIMESTAMPTZ DEFAULT NOW()`,
    },
    constraints: {
      unique_server_and_config: {
        type: "UNIQUE",
        content: "server_name, config",
      },
      unique_server_and_id: {
        type: "UNIQUE",
        content: "server_name, id",
      },
    },
  },
  mcp_server_tools: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      name: `TEXT NOT NULL`,
      icon: `TEXT`,
      description: `TEXT NOT NULL`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      inputSchema: {
        jsonbSchema: { record: { values: { type: "unknown" } } },
      },
      outputSchema: {
        nullable: true,
        jsonbSchema: { record: { values: { type: "unknown" } } },
      },
      annotations: {
        jsonbSchemaType: {
          title: {
            type: "string",
            optional: true,
            title: "Human-readable title for the tool",
          },
          readOnlyHint: {
            type: "boolean",
            optional: true,
            title:
              "If true, tool does not modify its environment (read-only). ",
          },
          openWorldHint: {
            type: "boolean",
            optional: true,
            title: "If true, tool interacts with external entities",
          },
          idempotentHint: {
            type: "boolean",
            optional: true,
            title:
              "If true, repeated calls with same args have no additional effect",
          },
          destructiveHint: {
            type: "boolean",
            optional: true,
            title: "If true, the tool may perform destructive updates",
          },
        },
        nullable: true,
      },
      icons: {
        nullable: true,
        jsonbSchema: {
          arrayOfType: {
            src: "string",
            mimeType: { type: "string", optional: true },
            sizes: { type: "string[]", optional: true },
            theme: { enum: ["light", "dark"], optional: true },
          },
        },
      },
      mode: {
        info: { hint: "Used by prostgles mcp tools" },
        nullable: true,
        /**
         * - auto-approved-user-actionable:
         *        The tool is executed without approval and result is not passed to the llm.
         *        Input and/or output can then be displayed to the user to take actions on it.
         *        Tool result can be overwritten by the user and that overwritten and passed to the llm.
         * - user-provides-response:
         *        The tool input is provided to the user to interact with and give feedback (which will be incorporated into the tool result).
         *        No execution logic and mostly used for structured questions and answers
         */
        enum: [
          "auto-approved-user-actionable",
          "user-provides-response",
          "always-needs-approval",
        ],
      },
    },
    indexes: {
      unique_server_name_tool_name: {
        unique: true,
        columns: "server_name, name",
      },
    },
  },
  mcp_server_logs: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers(name) ON DELETE CASCADE`,
      log: `TEXT NOT NULL DEFAULT ''`,
      error: `TEXT`,
      install_log: `TEXT`,
      install_error: `TEXT`,
      last_updated: `TIMESTAMPTZ DEFAULT NOW()`,
    },
  },
  llm_chats_allowed_mcp_tools: {
    info: {
      label: "Allowed MCP tools",
    },
    columns: {
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      server_name: `TEXT NOT NULL REFERENCES mcp_servers ON DELETE CASCADE`,
      tool_id: `INTEGER NOT NULL REFERENCES mcp_server_tools(id) ON DELETE CASCADE`,
      server_config_id: `INTEGER REFERENCES mcp_server_configs ON DELETE CASCADE`,
      auto_approve: `BOOLEAN DEFAULT FALSE`,
    },
    indexes: {
      unique_chat_allowed_tool: {
        unique: true,
        columns: "chat_id, tool_id",
      },
    },
  },
  mcp_tool_approval_requests: {
    columns: {
      id: `SERIAL PRIMARY KEY`,
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      connection_id: `UUID REFERENCES connections(id) ON DELETE CASCADE`,
      message_id: `int8 REFERENCES llm_messages(id) ON DELETE CASCADE`,
      source: {
        jsonbSchema: {
          oneOfType: [
            {
              type: { enum: ["chat"] },
              responseCount: {
                type: "integer",
                description:
                  "Total number of responses needed for the message to be considered fully responded to. Used to determine when to run requests and respond to AI",
              },
            },
            {
              type: { enum: ["proxy"] },
              parentToolUseMessageId: "string",
            },
          ],
        },
      },
      tool_name: `TEXT NOT NULL`,
      input: { jsonbSchema: { record: { values: "unknown" } } },
      server_name: `TEXT NOT NULL`,
      tool_use_id: `TEXT NOT NULL`,
      /** TODO: finish multi-config */
      server_config_id: `INTEGER REFERENCES mcp_server_configs(id) ON DELETE SET NULL`,
      response: {
        nullable: true,
        enum: ["approve", "deny", "auto-approve", "timed-out"],
      },
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      updated: `TIMESTAMPTZ DEFAULT NOW()`,
    },
    constraints: {
      tool_name_server_name_fk:
        "FOREIGN KEY (server_name, tool_name) REFERENCES mcp_server_tools(server_name, name) ON DELETE CASCADE",
    },
  },
  mcp_server_tool_calls: {
    columns: {
      id: `SERIAL PRIMARY KEY `,
      chat_id: `INTEGER REFERENCES llm_chats(id) ON DELETE SET NULL`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      mcp_tool_approval_requests_id: `INTEGER REFERENCES mcp_tool_approval_requests(id) ON DELETE SET NULL`,
      mcp_server_name: `TEXT REFERENCES mcp_servers(name) ON DELETE SET NULL`,
      mcp_tool_name: `TEXT`,
      tool_use_id: `TEXT DEFAULT ''`,
      mcp_server_config_id: `INTEGER`,
      mcp_full_tool_name: `TEXT NOT NULL`,
      input: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: {
              type: "unknown",
            },
          },
        },
      },
      output: {
        nullable: true,
        jsonbSchema: {
          record: {
            values: {
              type: "unknown",
            },
          },
        },
      },
      error: {
        nullable: true,
        jsonbSchema: {
          type: "unknown",
        },
      },
      called_at: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
      finished_at: `TIMESTAMPTZ`,
    },
    constraints: {
      mcp_tool_name_server_name_fk:
        "FOREIGN KEY (mcp_server_name, mcp_tool_name) REFERENCES mcp_server_tools(server_name, name) ON DELETE SET NULL",
      mcp_server_config_id_fk:
        "FOREIGN KEY (mcp_server_name, mcp_server_config_id) REFERENCES mcp_server_configs(server_name, id) ON DELETE SET NULL",
    },
  },
};
