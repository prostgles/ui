import { databaseAccessSchema } from "@common/mcp/databaseAccessSchema";
import { dbMcpSchema } from "@common/mcp/db.mcp.schema";
import type { ProstglesDbTools } from "@common/mcpUtils";
import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { proxyDbCommands } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/agenticWorkflow/runtimeSdk/tableHandlers";
import type { ValidateRowArgsCommon } from "prostgles-server/dist/PublishParser/publishTypesAndUtils";
import type { TableConfig } from "prostgles-server";
import { getKeys, isDefined, type JSONB } from "prostgles-types";
import { agentOutputSchemaType } from "../../../../common/mcp/startAgenticWorkflowSchema";
import { tablePermissionsSchema } from "../tablePermissionsSchema";
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

const ALL_TOOLS = getKeys(dbMcpSchema);

const toolsNotAllowedForProxyDbCalls = ["get_existing_tables_schema"];
if (
  proxyDbCommands.sort().join() !==
  ALL_TOOLS.filter((v) => !toolsNotAllowedForProxyDbCalls.includes(v))
    .sort()
    .join()
) {
  throw new Error(
    `proxyDbCommands and ALL_TOOLS are out of sync. proxyDbCommands: ${proxyDbCommands.join(", ")} ALL_TOOLS: ${ALL_TOOLS.join(", ")}`,
  );
}

export const tableConfigLlmChats: TableConfig<{ en: 1 }> = {
  llm_chats: {
    /** Breaks ts generated schema  */
    // constraints: {
    //   parent_chat_message_fk:
    //     "FOREIGN KEY (parent_chat_message_id) REFERENCES llm_messages(id) ON DELETE SET NULL",
    // },
    columns: {
      id: `INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY`,
      name: `TEXT NOT NULL DEFAULT 'New chat'`,
      user_id: `UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
      connection_id: `UUID REFERENCES connections(id) ON DELETE CASCADE`,
      parent_chat_id: {
        sqlDefinition: `INTEGER REFERENCES llm_chats(id) ON DELETE SET NULL`,
        info: {
          hint: "If defined then is Agentic chat",
        },
      },
      parent_chat_message_id: "INT8",
      agent_info: {
        nullable: true,
        jsonbSchema: {
          oneOf: [
            { type: { type: { enum: ["orchestrator"] } } },
            {
              type: {
                type: { enum: ["agent"] },
                name: { type: "string", optional: true },
                toolUseId: { type: "string", optional: true },
                prompt: {
                  type: "string",
                  title: "Prompt",
                  description: "Prompt used for agentic chat",
                },
                maxIterations: {
                  type: "integer",
                  optional: true,
                  title: "Max iterations",
                  description:
                    "Maximum number of iterations for the agentic workflow. An iteration is a single cycle of the agent thinking, tool calling and observing the results. Set to 0 for unlimited iterations.",
                },
                outputSchema: {
                  title: "Output schema",
                  description: "JSON schema for validating agent output",
                  ...agentOutputSchemaType,
                },
              },
            },
          ],
        },
      },
      model: `INTEGER  REFERENCES llm_models(id)`,
      llm_prompt_id: {
        label: "Prompt",
        sqlDefinition: `INTEGER REFERENCES llm_prompts(id) ON DELETE SET NULL`,
      },
      created: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
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
            {
              type: {
                state: { enum: ["stopped"] },
                reason: {
                  enum: [
                    "max_total_cost_usd",
                    "estimated_future_max_total_cost_usd",
                    "maximum_consecutive_tool_fails",
                    "manual",
                    "max_iterations_reached",
                  ],
                },
                timestamp: "Date",
              },
            },
            {
              type: {
                state: { enum: ["loading"] },
                /** Timestamp since started waiting for LLM response */
                since: "Date",
              },
            },
            {
              type: {
                state: { enum: ["goal-reached"] },
                data: "unknown",
                timestamp: "Date",
              },
            },
            {
              type: {
                state: {
                  enum: ["goal-data-validation-failure", "goal-failure"],
                },
                data: "unknown",
                error: "string",
                timestamp: "Date",
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
                enum: ["SameAsData"],
                title: "Type",
                description:
                  "Inherit schema scope from data access (Custom tables, or Full when SQL access allows it).",
              },
            },
            {
              type: {
                enum: ["OnRequest"],
                title: "Type",
                description:
                  "Schema information is not added to the chat prompt, but can be requested by the AI assistant as a tool call.",
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
              mode: {
                enum: ["execute_readonly_sql"],
                description:
                  "Can run readonly SQL queries (if the current user is allowed)",
              },
              ...commonrunSQLOpts,
            },
            {
              mode: {
                enum: ["execute_sql"],
                description:
                  "Can run SQL queries that will be commited (if the current user is allowed). Use with caution",
              },
              allowedCommands:
                databaseAccessSchema.oneOfType[1].allowedCommands,
              ...commonrunSQLOpts,
            },
            {
              mode: {
                enum: ["custom"],
                description:
                  "Can only access specific tables on behalf of the user",
              },
              auto_approve: commonrunSQLOpts.auto_approve,
              tablePermissions: tablePermissionsSchema,
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
        sqlDefinition: `NUMERIC NOT NULL DEFAULT 5`,
        info: {
          hint: "Maximum total cost of the chat in USD. If set to 0 then no limit is applied",
        },
      },
      currently_typed_message: {
        sqlDefinition: `TEXT`,
      },
      options: {
        nullable: true,
        jsonbSchemaType: {
          mcpToolSchemaMode: {
            enum: ["ts-types-in-description", "hide-schemas-and-descriptions"],
            optional: true,
          },
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
    hooks: {
      afterEach: [
        {
          commands: { insert: 1, update: 1 },
          changedFields: ["db_data_permissions", "db_schema_permissions"],
          validate: async (args) => {
            const { row, dbx } = args as unknown as ValidateRowArgsCommon<
              DBSSchema["llm_chats"],
              DBS
            >;
            await dbx.llm_chats_allowed_mcp_tools.delete({
              chat_id: row.id,
              server_name: "db",
            });
            const dataAccess = row.db_data_permissions;
            let toolsToAllow: (keyof typeof dbMcpSchema)[] = [];
            if (dataAccess?.mode) {
              toolsToAllow =
                dataAccess.mode === "custom" ?
                  Array.from(
                    Object.values(dataAccess.tablePermissions)
                      .map((v) => {
                        return [
                          ...(v.select ? (["find", "count"] as const) : []),
                          ...(v.delete ? (["delete"] as const) : []),
                          ...(v.insert ?
                            (["insert", "insertMany"] as const)
                          : []),
                          ...(v.update ? (["update"] as const) : []),
                        ].filter(isDefined);
                      })
                      .filter(isDefined)
                      .flat(),
                  )
                : dataAccess.mode === "execute_sql" ? ALL_TOOLS
                : ([
                    "execute_readonly_sql",
                    "count",
                    "find",
                  ] satisfies (keyof ProstglesDbTools)[]);
            }

            const schemaAccess = row.db_schema_permissions;
            if (schemaAccess && schemaAccess.type !== "None") {
              if (schemaAccess.type === "SameAsData" && !toolsToAllow.length) {
                // If schema access is same as data access but no data access tools are allowed then don't allow schema access tools either
              } else {
                toolsToAllow.push("get_existing_tables_schema");
              }
            }

            if (toolsToAllow.length) {
              toolsToAllow = Array.from(new Set(toolsToAllow));
              const tools = await dbx.mcp_server_tools.find({
                server_name: "db",
                name: { $in: toolsToAllow },
              });
              if (tools.length !== toolsToAllow.length) {
                throw new Error("Some tools not found");
              }
              await dbx.llm_chats_allowed_mcp_tools.insertMany(
                tools.map((tool) => ({
                  chat_id: row.id,
                  tool_id: tool.id,
                  server_name: tool.server_name,
                  auto_approve:
                    tool.name === "get_existing_tables_schema" ?
                      true
                    : (dataAccess?.auto_approve ?? false),
                })),
              );
            }
          },
        },
      ],
    },
  },
};
