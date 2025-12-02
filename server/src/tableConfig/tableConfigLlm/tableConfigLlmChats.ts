import type { TableConfig } from "prostgles-server/dist/TableConfig/TableConfig";
import type { JSONB } from "prostgles-types";
import { extraRequestData } from "./tableConfigLlmExtraRequestData";

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

export const tableConfigLlmChats: TableConfig<{ en: 1 }> = {
  llm_chats: {
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      parent_chat_id: {
        sqlDefinition: `INTEGER REFERENCES llm_chats(id) ON DELETE SET NULL`,
        info: {
          hint: "Agentic chats can have a parent chat",
        },
      },
      name: `TEXT NOT NULL DEFAULT 'New chat'`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      connection_id: `UUID REFERENCES connections(id) ON DELETE CASCADE`,
      model: `INTEGER  REFERENCES llm_models(id)`,
      llm_prompt_id: {
        label: "Prompt",
        sqlDefinition: `INTEGER REFERENCES llm_prompts(id) ON DELETE SET NULL`,
      },
      created: `TIMESTAMPTZ DEFAULT NOW()`,
      disabled_message: {
        sqlDefinition: `TEXT`,
        info: { hint: "Message shown when chat is disabled" },
      },
      disabled_until: {
        sqlDefinition: `TIMESTAMPTZ`,
        info: { hint: "If set then chat is disabled until this time" },
      },
      status: {
        nullable: true,
        jsonbSchema: {
          oneOf: [
            { type: { state: { enum: ["stopped"] } } },
            {
              type: {
                state: { enum: ["loading"] },
                /** Timestamp since started waiting for LLM response */
                since: "Date",
              },
            },
          ],
        },
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
                title: "Tables",
                type: "Lookup[]",
                lookup: {
                  type: "schema",
                  object: "table",
                  isArray: true,
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
                    type: "Lookup",
                    lookup: {
                      type: "schema",
                      object: "table",
                    },
                  },
                  /** TODO: this must re-use access control data and UI */
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
};
