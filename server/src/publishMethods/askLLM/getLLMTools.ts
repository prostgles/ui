import {
  getJSONBSchemaAsJSONSchema,
  isDefined,
  type JSONB,
} from "prostgles-types";
import type { DBS } from "../..";
import {
  getMCPFullToolName,
  PROSTGLES_MCP_TOOLS,
} from "../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";

type Args = {
  chat: DBSSchema["llm_chats"];
  dbs: DBS;
  provider: string;
  connectionId: string;
};

type MCPToolSchema = {
  name: string;
  description: string;
  input_schema: ReturnType<typeof getJSONBSchemaAsJSONSchema>;
};

export const getLLMTools = async ({
  dbs,
  provider,
  chat,
  connectionId,
}: Args): Promise<undefined | MCPToolSchema[]> => {
  const canUseTools = provider === "Prostgles" || provider === "Anthropic";
  if (!canUseTools) return undefined;
  const { id: chatId } = chat;

  const dbTool: MCPToolSchema | undefined =
    chat.db_data_permissions?.type === "Run SQL" ?
      {
        ...PROSTGLES_MCP_TOOLS[0],
        input_schema: getJSONBSchemaAsJSONSchema("prostgles", "execute_sql", {
          type: {
            sql: "string",
          },
        }),
      }
    : undefined;

  const published_methods = await dbs.published_methods.find({
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: chatId,
      },
    },
  });

  const mcpTools = (
    await dbs.mcp_server_tools.find({
      $existsJoined: {
        llm_chats_allowed_mcp_tools: {
          chat_id: chatId,
        },
      },
    })
  ).map((t) => {
    return {
      name: getMCPFullToolName(t),
      description: t.description,
      input_schema: t.inputSchema,
    };
  });
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments } = m;
    const properties = _arguments.reduce(
      (acc, arg) => ({
        ...acc,
        [arg.name]:
          (
            arg.type === "JsonbSchema" ||
            arg.type === "Lookup" ||
            arg.type === "Lookup[]"
          ) ?
            "any"
          : arg.type,
      }),
      {} as JSONB.ObjectType["type"],
    );
    return {
      name,
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    };
  });

  const tools: Record<string, MCPToolSchema> = {};

  /** Check for name collisions */
  [...mcpTools, ...serverSideFuncTools, dbTool].forEach((tool) => {
    if (!tool) return;
    const { name } = tool;
    if (tools[name]) {
      throw new Error(
        `Tool name collision: ${name} is used by both MCP tool and/or other function`,
      );
    }
    tools[name] = tool;
  });
  // if (Provider === "OpenAI") {
  //   return allTools.map(({ input_schema, ...func }) => {
  //     return {
  //       type: "function",
  //       function: func,
  //       parameters: input_schema,
  //     };
  //   });
  // }
  return Object.values(tools);
};
