import type {
  ColumnConfig,
  TableConfig,
} from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";

const toolUseContent: JSONB.FieldType = {
  oneOf: [
    "string",
    {
      arrayOf: {
        oneOf: [
          {
            type: {
              type: {
                enum: ["text"],
              },
              text: "string",
            },
          },
          {
            type: {
              type: {
                enum: ["image"],
              },
              mimeType: "string",
              data: "string",
            },
          },
          {
            type: {
              type: { enum: ["resource"] },
              resource: {
                type: {
                  uri: "string",
                  mimeType: { type: "string", optional: true },
                  text: { type: "string", optional: true },
                  blob: { type: "string", optional: true },
                },
              },
            },
          },
        ],
      },
    },
  ],
};

const extraRequestData = {
  extra_headers: {
    nullable: true,
    jsonbSchema: {
      record: { values: "string" },
    },
  },
  extra_body: {
    nullable: true,
    jsonbSchemaType: {
      temperature: { type: "number", optional: true },
      frequency_penalty: { type: "number", optional: true },
      max_completion_tokens: { type: "integer", optional: true },
      max_tokens: { type: "integer", optional: true },
      presence_penalty: { type: "number", optional: true },
      response_format: {
        enum: ["json", "text", "srt", "verbose_json", "vtt"],
        optional: true,
      },
    },
  },
} as const satisfies Record<
  string,
  ColumnConfig<{
    en: 1;
  }>
>;

export const tableConfigLLM: TableConfig<{ en: 1 }> = {
  llm_providers: {
    columns: {
      id: `TEXT PRIMARY KEY`,
      api_url: `TEXT NOT NULL`,
      api_docs_url: `TEXT`,
      api_pricing_url: `TEXT`,
      logo_base64: `TEXT`,
      ...extraRequestData,
    },
  },
  llm_models: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL`,
      provider_id: `TEXT NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE`,
      pricing_info: {
        info: {
          hint: "Prices are per 1M tokens",
        },
        nullable: true,
        jsonbSchemaType: {
          input: "number",
          output: "number",
          cachedInput: { type: "number", optional: true },
          threshold: {
            description:
              "Some providers charge more for tokens above a certain limit",
            optional: true,
            type: { tokenLimit: "number", input: "number", output: "number" },
          },
        },
      },
      chat_suitability_rank: "NUMERIC",
      model_created: `TIMESTAMP DEFAULT NOW()`,
      mcp_tool_support: `BOOLEAN DEFAULT FALSE`,
      ...extraRequestData,
    },
    indexes: {
      unique_model_name: {
        unique: true,
        columns: "name, provider_id",
      },
    },
  },
  llm_credentials: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT UNIQUE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      provider_id: {
        label: "Provider",
        sqlDefinition: `TEXT NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE`,
      },
      default_model_name: {
        label: "Default model",
        sqlDefinition: `TEXT`,
      },
      api_key: `TEXT NOT NULL DEFAULT ''`,
      ...extraRequestData,
      is_default: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE`,
        info: {
          hint: "If true then this is the default credential used in new AI Assistant chats",
        },
      },
      created: {
        sqlDefinition: `TIMESTAMP DEFAULT NOW()`,
      },
    },
    constraints: {
      default_model_fkey: `FOREIGN KEY (default_model_name, provider_id) REFERENCES llm_models(name, provider_id)`,
    },
    indexes: {
      unique_default: {
        unique: true,
        columns: "is_default",
        where: "is_default = TRUE",
      },
    },
  },
  llm_prompts: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'New prompt'`,
      description: `TEXT DEFAULT ''`,
      user_id: `UUID REFERENCES users(id) ON DELETE SET NULL`,
      prompt: `TEXT NOT NULL CHECK(LENGTH(btrim(prompt)) > 0)`,
      options: {
        nullable: true,
        jsonbSchemaType: {
          disable_tools: { type: "boolean", optional: true },
        },
      },
      created: `TIMESTAMP DEFAULT NOW()`,
    },
    indexes: {
      unique_llm_prompt_name: {
        unique: true,
        columns: "name, user_id",
      },
    },
  },
  llm_chats: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'New chat'`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      connection_id: `UUID REFERENCES connections(id) ON DELETE CASCADE`,
      model: `INTEGER  REFERENCES llm_models(id)`,
      llm_prompt_id: {
        label: "Prompt",
        sqlDefinition: `INTEGER REFERENCES llm_prompts(id) ON DELETE SET NULL`,
      },
      created: `TIMESTAMP DEFAULT NOW()`,
      disabled_message: {
        sqlDefinition: `TEXT`,
        info: { hint: "Message shown when chat is disabled" },
      },
      disabled_until: {
        sqlDefinition: `TIMESTAMPTZ`,
        info: { hint: "If set then chat is disabled until this time" },
      },
    },
    indexes: {
      unique_chat_for_connection: {
        columns: "id, connection_id",
        unique: true,
      },
    },
  },
  llm_messages: {
    columns: {
      id: `int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID REFERENCES users(id) ON DELETE CASCADE`,
      is_loading: `BOOLEAN DEFAULT FALSE`,
      message: {
        jsonbSchema: {
          arrayOf: {
            oneOf: [
              {
                type: {
                  type: {
                    enum: ["text"],
                  },
                  text: "string",
                },
              },
              {
                type: {
                  type: {
                    enum: ["image"],
                  },
                  source: {
                    type: {
                      type: { enum: ["base64"] },
                      media_type: "string",
                      data: "string",
                    },
                  },
                },
              },
              {
                type: {
                  type: { enum: ["tool_result"] },
                  tool_use_id: "string",
                  content: toolUseContent,
                  is_error: { optional: true, type: "boolean" },
                },
              },
              {
                type: {
                  type: { enum: ["tool_use"] },
                  id: "string",
                  name: "string",
                  input: "any",
                },
              },
            ],
          },
        },
      },
      meta: "JSONB",
      created: `TIMESTAMP DEFAULT NOW()`,
    },
  },
  llm_chats_allowed_functions: {
    dropIfExists: true,
    columns: {
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      connection_id: `UUID NOT NULL, FOREIGN KEY(chat_id, connection_id) REFERENCES llm_chats(id, connection_id) ON DELETE CASCADE`,
      server_function_id: `INTEGER NOT NULL, FOREIGN KEY(server_function_id, connection_id) REFERENCES published_methods(id, connection_id) ON DELETE CASCADE`,
    },
    indexes: {
      unique_chat_tool: {
        unique: true,
        columns: "chat_id, server_function_id",
      },
    },
  },
  access_control_allowed_llm: {
    columns: {
      access_control_id: `INTEGER NOT NULL REFERENCES access_control(id)`,
      llm_credential_id: `INTEGER NOT NULL REFERENCES llm_credentials(id)`,
      llm_prompt_id: `INTEGER NOT NULL REFERENCES llm_prompts(id)`,
    },
    indexes: {
      unique: {
        unique: true,
        columns: "access_control_id, llm_credential_id, llm_prompt_id",
      },
    },
  },
};
