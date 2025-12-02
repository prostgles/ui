import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { tableConfigLlmChats } from "./tableConfigLlmChats";
import { extraRequestData } from "./tableConfigLlmExtraRequestData";

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
                enum: ["image", "audio"],
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
          {
            type: {
              type: { enum: ["resource_link"] },
              uri: "string",
              name: "string",
              mimeType: { type: "string", optional: true },
              description: { type: "string", optional: true },
            },
          },
        ],
      },
    },
  ],
};

export const tableConfigLLM: TableConfig<{ en: 1 }> = {
  llm_providers: {
    columns: {
      id: `TEXT PRIMARY KEY`,
      api_url: `TEXT NOT NULL`,
      api_docs_url: `TEXT`,
      api_pricing_url: `TEXT`,
      logo_url: `TEXT`,
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
          cachedInput: {
            type: "number",
            description: "Prompt caching write",
            optional: true,
          },
          cachedOutput: {
            type: "number",
            description: "Prompt caching read",
            optional: true,
          },
          threshold: {
            description:
              "Some providers charge more for tokens above a certain limit",
            optional: true,
            type: { tokenLimit: "number", input: "number", output: "number" },
          },
        },
      },
      chat_suitability_rank: {
        sqlDefinition: `NUMERIC`,
        info: { hint: "Lowest number is used in new chats" },
      },
      model_created: `TIMESTAMPTZ DEFAULT NOW()`,
      mcp_tool_support: `BOOLEAN DEFAULT FALSE`,
      context_length: ` INTEGER NOT NULL DEFAULT 0`,
      architecture: {
        nullable: true,
        jsonbSchemaType: {
          modality: {
            optional: true,
            type: "string",
            description:
              "Input modality (e.g., 'text+image->text'). Indicates how input is processed and output is generated.",
          },
          input_modalities: "string[]", // Supported input types: ["file", "image", "text"]
          output_modalities: "string[]", // Supported output types: ["text"]
          tokenizer: "string", // Tokenization method used
          instruct_type: { oneOf: ["string"], nullable: true }, // Instruction format type (null if not applicable)
        },
      },
      supported_parameters: {
        nullable: true,
        jsonbSchema: {
          arrayOf: {
            type: "string",
            /**
             * https://openrouter.ai/docs/overview/models
             */
            // undocumented values keep on being added so disabled for now.
            // allowedValues: [
            //   "tools", // - Function calling capabilities
            //   "tool_choice", // - Tool selection control
            //   "max_tokens", // - Response length limiting
            //   "temperature", // - Randomness control
            //   "top_p", // - Nucleus sampling
            //   "top_k",
            //   "reasoning", // - Internal reasoning mode
            //   "include_reasoning", // - Include reasoning in response
            //   "structured_outputs", // - JSON schema enforcement
            //   "response_format", // - Output format specification
            //   "stop", // - Custom stop sequences
            //   "frequency_penalty", // - Repetition reduction
            //   "presence_penalty", // - Topic diversity
            //   "seed", // - Deterministic outputstools - Function calling capabilities
            // ],
          },
        },
      },
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
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      provider_id: {
        label: "Provider",
        sqlDefinition: `TEXT NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE`,
      },
      api_key: `TEXT NOT NULL DEFAULT ''`,
      name: { sqlDefinition: `TEXT UNIQUE`, info: { hint: "Optional" } },
      ...extraRequestData,
      is_default: {
        sqlDefinition: `BOOLEAN NOT NULL DEFAULT FALSE`,
        info: {
          hint: "If true then this is the default credential used in new AI Assistant chats",
        },
      },
      created: {
        sqlDefinition: `TIMESTAMPTZ DEFAULT NOW()`,
      },
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
      prompt: `TEXT NOT NULL DEFAULT ''`,
      options: {
        nullable: true,
        jsonbSchemaType: {
          prompt_type: {
            enum: ["dashboards", "tasks", "agent_workflow"],
            optional: true,
            description:
              "Internal prompt type used in controlling chat context. Some tools may not be available for all types",
          },
        },
      },
      created: `TIMESTAMPTZ DEFAULT NOW()`,
    },
    indexes: {
      unique_llm_prompt: {
        unique: true,
        columns: "name, user_id, prompt",
      },
    },
  },
  ...tableConfigLlmChats,
  llm_messages: {
    columns: {
      id: `int8 PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      user_id: `UUID REFERENCES users(id) ON DELETE CASCADE`,
      llm_model_id: `INTEGER REFERENCES llm_models(id) ON DELETE SET NULL`,
      cost: `NUMERIC NOT NULL DEFAULT 0`,
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
                  reasoning: {
                    type: "string",
                    optional: true,
                    description:
                      "Internal reasoning message used by the model to explain its thought process",
                  },
                },
              },
              {
                type: {
                  type: {
                    enum: ["image", "audio", "video", "application", "text"],
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
                  tool_name: { type: "string" },
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
      created: `TIMESTAMPTZ DEFAULT NOW()`,
    },
  },
  llm_chats_allowed_functions: {
    info: {
      label: "Allowed functions",
    },
    columns: {
      chat_id: `INTEGER NOT NULL REFERENCES llm_chats(id) ON DELETE CASCADE`,
      connection_id: `UUID NOT NULL, FOREIGN KEY(chat_id, connection_id) REFERENCES llm_chats(id, connection_id) ON DELETE CASCADE`,
      server_function_id: `INTEGER NOT NULL, FOREIGN KEY(server_function_id, connection_id) REFERENCES published_methods(id, connection_id) ON UPDATE CASCADE ON DELETE CASCADE`,
      auto_approve: {
        info: {
          hint: "If true then the function call request is automatically approved",
        },
        sqlDefinition: `BOOLEAN DEFAULT FALSE`,
      },
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
