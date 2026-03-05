import { getMCPFullToolName } from "@common/prostglesMcp";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import type { AuthClientRequest } from "prostgles-server";
import { getKeys, isEmpty } from "prostgles-types";
import type { McpServerToolsAllowed } from "./defineAgenticWorkflow";

export const getValidatedMcpServerToolsAllowed = async (
  dbs: DBS,
  toolsFilter: McpServerToolsAllowed | "*",
) => {
  if (isEmpty(toolsFilter)) return [];

  const serverTools = await dbs.mcp_server_tools.find(
    toolsFilter === "*" ?
      {}
    : {
        server_name: { $in: getKeys(toolsFilter) },
      },
    {
      select: {
        id: 1,
        name: 1,
        server_name: 1,
        inputSchema: 1,
        outputSchema: 1,
        description: 1,
      },
    },
  );

  const workflowToolsWithInfo =
    toolsFilter === "*" ? serverTools : (
      Object.entries(toolsFilter)
        .map(([serverName, toolNamesObj]) => {
          if (!toolNamesObj || isEmpty(toolNamesObj)) {
            throw new Error(
              `MCP Server ${serverName} has no tools specified in workflow allowed tools`,
            );
          }
          const toolsForServer = serverTools.filter(
            (t) => t.server_name === serverName,
          );
          const toolNames = getKeys(toolNamesObj);
          if (!toolNames.length) {
            throw new Error(
              `MCP Server ${serverName} has no tools specified in workflow allowed tools`,
            );
          }
          const tools = toolsForServer.filter((t) =>
            toolNames.includes(t.name),
          );
          if (tools.length !== toolNames.length) {
            throw new Error(
              `Not all tools specified for MCP Server ${serverName} were found. Tools not found: ${toolNames
                .filter((toolName) => !tools.find((t) => t.name === toolName))
                .join(", ")}`,
            );
          }
          return tools;
        })
        .flat()
    );

  return workflowToolsWithInfo;
};
export const getOrchestrationToolsHandler = async ({
  chatId,
  dbs,
  userId,
  orchestrationTools,
  connectionId,
}: {
  dbs: DBS;
  chatId: number;
  userId: string;
  orchestrationTools: McpServerToolsAllowed | undefined;
  connectionId: string;
}) => {
  const orchestrationToolsWithInfo =
    orchestrationTools &&
    (await getValidatedMcpServerToolsAllowed(dbs, orchestrationTools));

  /**
   * Holds the tool permissions
   */
  let workflowToolsChat: DBSSchema["llm_chats"] | null = null;
  const getOrchestratorToolsChat = async () => {
    if (workflowToolsChat) return workflowToolsChat;
    if (!orchestrationToolsWithInfo) {
      throw new Error(
        `No workflow tools specified for this workflow. Cannot create workflow tools chat.`,
      );
    }
    workflowToolsChat = await dbs.llm_chats.insert(
      {
        name: "Workflow Orchestrator Tools Chat",
        agent_info: "orchestrator",
        user_id: userId,
        connection_id: connectionId,
        parent_chat_id: chatId,
      },
      { returning: "*" },
    );
    await dbs.llm_chats_allowed_mcp_tools.insert(
      orchestrationToolsWithInfo.map(({ id, server_name }) => ({
        chat_id: workflowToolsChat!.id,
        tool_id: id,
        server_name,
        auto_approve: true, // TODO: make approvable in UI
      })) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"][],
    );
    return workflowToolsChat;
  };

  const orchestrationToolsHandler = new Map<
    string,
    (
      args: Record<string, unknown> | undefined,
      clientReq: AuthClientRequest,
    ) => Promise<unknown>
  >();
  orchestrationToolsWithInfo?.forEach(({ name, server_name }) => {
    const fullToolName = getMCPFullToolName(server_name, name);
    orchestrationToolsHandler.set(fullToolName, async (args, clientReq) => {
      const workflowToolsChat = await getOrchestratorToolsChat();
      const result = await callMCPServerTool({
        user: { id: userId },
        chat_id: workflowToolsChat.id,
        dbs,
        serverName: server_name,
        toolName: name,
        toolArguments: args,
        clientReq,
      });

      const data = result.structuredContent || result.content;
      if (result.isError) {
        throw data;
      }
      return data;
    });
  });

  return { orchestrationToolsHandler };
};
