import {
  getJSONBSchemaAsJSONSchema,
  isDefined,
  type JSONB,
} from "prostgles-types";
import type { DBS } from "../..";

import {
  getMCPFullToolName,
  getProstglesDBTools,
  getProstglesMCPFullToolName,
  PROSTGLES_MCP_SERVERS_AND_TOOLS,
  type ProstglesMcpTool,
} from "../../../../commonTypes/prostglesMcp";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { getAddTaskTools, suggestDashboardsTool } from "./prostglesMcpTools";
import { getEntries } from "../../../../commonTypes/utils";
import { getDockerMCP } from "../../DockerManager/DockerManager";

type Args = {
  isAdmin: boolean;
  chat: DBSSchema["llm_chats"];
  prompt: DBSSchema["llm_prompts"];
  dbs: DBS;
  connectionId: string;
};

export type MCPToolSchema = {
  name: string;
  description: string;
  input_schema: ReturnType<typeof getJSONBSchemaAsJSONSchema>;
};

export type MCPToolSchemaWithApproveInfo = MCPToolSchema &
  (
    | {
        type: "mcp";
        auto_approve: boolean;
      }
    | (ProstglesMcpTool & {
        auto_approve: boolean;
      })
  );
export const getLLMTools = async ({
  isAdmin,
  dbs,
  chat,
  connectionId,
  prompt,
}: Args): Promise<undefined | MCPToolSchemaWithApproveInfo[]> => {
  const { prompt_type } = prompt.options ?? {};

  const { id: chatId } = chat;

  let taskTool: MCPToolSchema | undefined = undefined;
  if (prompt_type === "tasks") {
    if (!isAdmin) {
      throw new Error("Only admins can use task creation tools");
    }
    const { published_methods } = await getPublishedMethodsTools(dbs, {});
    const { mcp_server_tools } = await getMCPServerTools(dbs, {});
    taskTool = getAddTaskTools({
      availableMCPTools: mcp_server_tools.map((t) => ({
        ...t,
        name: getMCPFullToolName(t.server_name, t.name),
      })),
      availableDBTools: published_methods.map((t) => ({
        ...t,
        name: getProstglesMCPFullToolName("prostgles-db-methods", t.name),
      })),
    });
  }

  const dbTools: MCPToolSchemaWithApproveInfo[] = getProstglesDBTools(chat).map(
    (tool) => {
      return {
        ...tool,
        input_schema: getJSONBSchemaAsJSONSchema(
          "",
          "",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          tool.schema,
        ),
      };
    },
  );

  const { serverSideFuncTools } = await getPublishedMethodsTools(dbs, {
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: chatId,
      },
    },
  });
  const llm_chats_allowed_functions =
    await dbs.llm_chats_allowed_functions.find({
      chat_id: chatId,
    });

  const llm_chats_allowed_mcp_tools =
    await dbs.llm_chats_allowed_mcp_tools.find({
      chat_id: chatId,
    });
  const { mcpTools } = await getMCPServerTools(dbs, {
    $existsJoined: {
      llm_chats_allowed_mcp_tools: {
        chat_id: chatId,
      },
    },
  });
  const tools: Record<string, MCPToolSchemaWithApproveInfo> = {};
  const dockerMCP = await getDockerMCP(dbs, chat);
  /** Check for name collisions */
  [
    ...mcpTools
      .map(({ id, ...tool }) => {
        const info = llm_chats_allowed_mcp_tools.find(
          ({ tool_id }) => tool_id === id,
        );
        const createContainerTool = dockerMCP.toolSchemas[0]!;
        if (!info) return;
        return {
          type: "mcp" as const,
          ...tool,
          ...info,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          input_schema:
            tool.name === "docker-sandbox--create_container" ?
              createContainerTool.inputSchema
            : tool.input_schema,
          description:
            tool.name === "docker-sandbox--create_container" ?
              createContainerTool.description
            : tool.description,
          auto_approve: Boolean(info.auto_approve),
        };
      })
      .filter(isDefined),
    ...serverSideFuncTools
      .map(({ id, ...t }) => {
        const info = llm_chats_allowed_functions.find(
          ({ server_function_id }) => server_function_id === id,
        );
        if (!info) return;
        return {
          type: "prostgles-db-methods" as const,
          ...t,
          ...info,
          auto_approve: Boolean(info.auto_approve),
        };
      })
      .filter(isDefined),
    ...dbTools,
    prompt_type === "dashboards" ?
      ({
        ...suggestDashboardsTool,
        auto_approve: true,
        type: "prostgles-ui",
        tool_name: "suggest_dashboards",
      } satisfies MCPToolSchemaWithApproveInfo)
    : undefined,
    taskTool &&
      ({
        ...taskTool,
        auto_approve: true,
        type: "prostgles-ui",
        tool_name: "suggest_tools_and_prompt",
      } satisfies MCPToolSchemaWithApproveInfo),
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

export const getAllToolNames = async (dbs: DBS): Promise<string[]> => {
  const mcpTools = await dbs.mcp_server_tools.find();
  const publishedMethods = await dbs.published_methods.find();

  return [
    ...mcpTools.map((t) => getMCPFullToolName(t.server_name, t.name)),
    ...publishedMethods.map((t) =>
      getProstglesMCPFullToolName("prostgles-db-methods", t.name),
    ),
    ...getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"]).map(
      ([toolName]) => getProstglesMCPFullToolName("prostgles-db", toolName),
    ),
    ...getEntries(PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-ui"]).map(
      ([toolName]) => getProstglesMCPFullToolName("prostgles-ui", toolName),
    ),
  ];
};

const getMCPServerTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.mcp_server_tools.find>[0],
) => {
  const mcp_server_tools = await dbs.mcp_server_tools.find(filter);
  const mcpTools = mcp_server_tools.map((t) => {
    return {
      id: t.id,
      name: getMCPFullToolName(t.server_name, t.name),
      description: t.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      input_schema: t.inputSchema,
    } satisfies MCPToolSchema & { id: number };
  });
  return { mcpTools, mcp_server_tools };
};

const getPublishedMethodsTools = async (
  dbs: DBS,
  filter: Parameters<typeof dbs.published_methods.find>[0],
) => {
  const published_methods = await dbs.published_methods.find(filter);
  const serverSideFuncTools = published_methods.map((m) => {
    const { name, description, arguments: _arguments, id } = m;
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
      id,
      tool_name: name,
      name: getProstglesMCPFullToolName("prostgles-db-methods", name),
      description,
      input_schema: getJSONBSchemaAsJSONSchema(
        "published_methods",
        "arguments",
        {
          type: properties,
        },
      ),
    } satisfies MCPToolSchema & { id: number; tool_name: string };
  });
  return { serverSideFuncTools, published_methods };
};
