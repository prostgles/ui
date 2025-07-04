import {
  getJSONBSchemaAsJSONSchema,
  pickKeys,
  type JSONB,
} from "prostgles-types";
import type { DBS } from "../..";
import {
  suggestDashboardsTool,
  executeSQLTool,
  getAddTaskTools,
  getMCPFullToolName,
} from "../../../../commonTypes/prostglesMcpTools";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";

type Args = {
  isAdmin: boolean;
  chat: DBSSchema["llm_chats"];
  prompt: DBSSchema["llm_prompts"];
  dbs: DBS;
  connectionId: string;
};

type MCPToolSchema = {
  name: string;
  description: string;
  input_schema: ReturnType<typeof getJSONBSchemaAsJSONSchema>;
};

export const getLLMTools = async ({
  isAdmin,
  dbs,
  chat,
  connectionId,
  prompt,
}: Args): Promise<undefined | MCPToolSchema[]> => {
  const { disable_tools, prompt_type } = prompt.options ?? {};

  /** Tools are not used with Dashboarding due to induced errors */
  if (disable_tools) return undefined;
  const { id: chatId } = chat;

  if (prompt_type === "tasks") {
    if (!isAdmin) {
      throw new Error("Only admins can use task creation tools");
    }
    const { serverSideFuncTools } = await getPublishedMethodsTools(dbs, {});
    const { mcpTools } = await getMCPServerTools(dbs, {});
    return [
      getAddTaskTools(
        [...serverSideFuncTools, ...mcpTools].map((t) =>
          pickKeys(t, ["name", "description"]),
        ),
      ) as MCPToolSchema,
    ];
  }

  const dbTool: MCPToolSchema | undefined =
    chat.db_data_permissions?.type === "Run SQL" ?
      {
        ...(executeSQLTool as MCPToolSchema),
        // input_schema: getJSONBSchemaAsJSONSchema("prostgles", "execute_sql", {
        //   type: {
        //     sql: "string",
        //   },
        // }),
      }
    : undefined;

  const { serverSideFuncTools } = await getPublishedMethodsTools(dbs, {
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: chatId,
      },
    },
  });

  const { mcpTools } = await getMCPServerTools(dbs, {
    $existsJoined: {
      llm_chats_allowed_mcp_tools: {
        chat_id: chatId,
      },
    },
  });
  const tools: Record<string, MCPToolSchema> = {};

  /** Check for name collisions */
  [
    ...mcpTools,
    ...serverSideFuncTools,
    dbTool,
    suggestDashboardsTool as MCPToolSchema,
  ].forEach((tool) => {
    if (!tool) return;
    const { name } = tool;
    if (tools[name]) {
      throw new Error(
        `Tool name collision: ${name} is used by both MCP tool and/or other function`,
      );
    }
    tools[name] = tool;
  });
  const toolList = Object.values(tools);

  return toolList;
};

const getMCPServerTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.mcp_server_tools.find>[0],
): Promise<{ mcpTools: MCPToolSchema[] }> => {
  const mcpTools = (await dbs.mcp_server_tools.find(filter)).map((t) => {
    return {
      name: getMCPFullToolName(t),
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      input_schema: t.inputSchema,
    };
  });
  return { mcpTools };
};

const getPublishedMethodsTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.published_methods.find>[0],
): Promise<{ serverSideFuncTools: MCPToolSchema[] }> => {
  const published_methods = await dbs.published_methods.find(filter);
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
      name: getMCPFullToolName({ server_name: "db-methods", name }),
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
  return { serverSideFuncTools };
};
