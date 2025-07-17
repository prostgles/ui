import type {
  ColumnConfig,
  TableConfig,
} from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";

const commonrunSQLOpts = {
  query_timeout: {
    type: "integer",
    title: "Query timeout (s)",
    optional: true,
    description: "Timeout in seconds for the queries.",
  },
  auto_approve: {
    type: "boolean",
    title: "Auto approve",
    optional: true,
    description:
      "If true then the assistant can run queries without asking for approval",
  },
} satisfies JSONB.ObjectType["type"];

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
      think: { type: "boolean", optional: true },
      stream: { type: "boolean", optional: true },
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
      model_created: `TIMESTAMP DEFAULT NOW()`,
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
      name: `TEXT UNIQUE`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      provider_id: {
        label: "Provider",
        sqlDefinition: `TEXT NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE`,
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
            enum: ["dashboards", "tasks"],
            optional: true,
            description:
              "Internal prompt type used in controlling chat context. Some tools may not be available for all types",
          },
        },
      },
      created: `TIMESTAMP DEFAULT NOW()`,
    },
    indexes: {
      unique_llm_prompt: {
        unique: true,
        columns: "name, user_id, prompt",
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
      is_loading: {
        sqlDefinition: `TIMESTAMPTZ`,
        info: { hint: "Timestamp since started waiting for LLM response" },
      },
      db_schema_permissions: {
        label: "Schema read access",
        nullable: true,
        info: {
          hint: "Controls which table and column definitions are used in the prompt",
        },
        defaultValue: { type: "Full" },
        jsonbSchema: {
          oneOfType: [
            {
              type: {
                enum: ["None"],
                title: "Type",
                description: "No schema information is provided",
              },
            },
            {
              type: {
                enum: ["Full"],
                title: "Type",
                description: "All tables, columns and constraints",
              },
            },
            {
              type: {
                enum: ["Custom"],
                title: "Type",
                description:
                  "Specific tables and their columns and constraints",
              },
              tables: {
                type: "Lookup[]",
                lookup: {
                  type: "schema",
                  object: "table",
                },
              },
            },
          ],
        },
      },
      db_data_permissions: {
        label: "Data access",
        nullable: true,
        info: {
          hint: "Controls how the assistant is allowed to view/interact with the data found in the database. \nSame connection and permissions are used as for the current user",
        },
        jsonbSchema: {
          oneOfType: [
            {
              Mode: {
                description:
                  "Cannot interact with any data from the database. This excludes the schema read access which is controlled separately",
                enum: ["None"],
              },
            },
            {
              Mode: {
                enum: ["Run readonly SQL"],
                description:
                  "Can run readonly SQL queries (if the current user is allowed)",
              },
              ...commonrunSQLOpts,
            },
            {
              Mode: {
                enum: ["Run commited SQL"],
                description:
                  "Can run SQL queries that will be commited (if the current user is allowed). Use with caution",
              },
              ...commonrunSQLOpts,
            },
            {
              Mode: {
                enum: ["Custom"],
                description:
                  "Can only access specific tables on behalf of the user",
              },
              auto_approve: commonrunSQLOpts.auto_approve,
              tables: {
                title: "Tables",
                description: "Tables the assistant can access",
                arrayOfType: {
                  tableName: {
                    title: "Table name",
                    type: "Lookup[]",
                    lookup: {
                      type: "schema",
                      object: "table",
                    },
                  },
                  select: { type: "boolean", optional: true },
                  update: { type: "boolean", optional: true },
                  insert: { type: "boolean", optional: true },
                  delete: { type: "boolean", optional: true },
                  // columns: {
                  //   optional: true,
                  //   type: "Lookup[]",
                  //   lookup: {
                  //     type: "schema",
                  //     object: "column",
                  //   },
                  //   description:
                  //     "Columns the assistant can access in the table",
                  // },
                },
              },
            },
          ],
        },
      },
      maximum_consecutive_tool_fails: {
        sqlDefinition: `INTEGER NOT NULL DEFAULT 5`,
        info: {
          hint: "Maximum number of consecutive tool call fails before the chat stops automatically approving tool calls. Useful to prevent infinite loops",
        },
      },
      max_total_cost_usd: {
        sqlDefinition: `NUMERIC NOT NULL DEFAULT 0`,
        info: {
          hint: "Maximum total cost of the chat in USD. If set to 0 then no limit is applied",
        },
      },
      ...extraRequestData,
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
      created: `TIMESTAMP DEFAULT NOW()`,
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
