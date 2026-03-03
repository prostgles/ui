import { getMCPFullToolName } from "@common/prostglesMcp";
import type { DBSSchema, DBSSchemaForInsert } from "@common/publishUtils";
import type { DBS } from "@src/index";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import type { AuthClientRequest } from "prostgles-server";
import { getKeys, isEmpty } from "prostgles-types";
import type { McpServerToolsAllowed } from "./defineAgenticWorkflow";

export const getValidatedMcpServerToolsAllowed = async (
  dbs: DBS,
  tools: McpServerToolsAllowed | undefined,
) => {
  if (!tools || isEmpty(tools)) return;

  const toolNameList = Object.entries(tools)
    .map(([serverName, toolNamesObj]) => {
      if (!toolNamesObj || isEmpty(toolNamesObj)) {
        return [];
      }
      const toolNames = getKeys(toolNamesObj);
      return toolNames.map((toolName) => ({
        toolName,
        serverName,
      }));
    })
    .flat();
  if (!toolNameList.length) {
    return;
  }
  const workflowToolsWithInfo = await dbs.mcp_server_tools.find(
    {
      $or: toolNameList.map(({ serverName, toolName }) => ({
        server_name: serverName,
        name: toolName,
      })),
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

  if (workflowToolsWithInfo.length !== toolNameList.length) {
    throw new Error(
      `Could not find all specified tools for workflow allowed tools. Tools not found: ${toolNameList
        .filter(
          ({ serverName, toolName }) =>
            !workflowToolsWithInfo.find(
              (t) => t.server_name === serverName && t.name === toolName,
            ),
        )
        .map(({ serverName, toolName }) => `${serverName}--${toolName}`)
        .join(", ")}`,
    );
  }

  return workflowToolsWithInfo;
};
export const getValidatedWorkflowTools = async ({
  chatId,
  dbs,
  userId,
  workflowAllowedTools,
  connectionId,
}: {
  dbs: DBS;
  chatId: number;
  userId: string;
  workflowAllowedTools: McpServerToolsAllowed | undefined;
  connectionId: string;
}) => {
  const workflowToolsWithInfo = await getValidatedMcpServerToolsAllowed(
    dbs,
    workflowAllowedTools,
  );

  let workflowToolsChat: DBSSchema["llm_chats"] | null = null;
  const getWorkflowToolsChat = async () => {
    if (workflowToolsChat) return workflowToolsChat;
    if (!workflowToolsWithInfo)
      throw new Error(
        "Workflow allowed tools were specified but no valid tools were found",
      );
    workflowToolsChat = await dbs.llm_chats.insert(
      {
        name: "Workflow Tools Chat",
        user_id: userId,
        connection_id: connectionId,
        parent_chat_id: chatId,
      },
      { returning: "*" },
    );
    await dbs.llm_chats_allowed_mcp_tools.insert(
      workflowToolsWithInfo.map(({ id, server_name }) => ({
        chat_id: workflowToolsChat!.id,
        tool_id: id,
        server_name,
        auto_approve: true, // TODO: make approvable in UI
      })) satisfies DBSSchemaForInsert["llm_chats_allowed_mcp_tools"][],
    );
    return workflowToolsChat;
  };

  const workflowToolsHandler = new Map<
    string,
    (
      args: Record<string, unknown> | undefined,
      clientReq: AuthClientRequest,
    ) => Promise<unknown>
  >();
  workflowToolsWithInfo?.forEach(({ name, server_name }) => {
    const fullToolName = getMCPFullToolName(server_name, name);
    workflowToolsHandler.set(fullToolName, async (args, clientReq) => {
      const workflowToolsChat = await getWorkflowToolsChat();
      return callMCPServerTool({
        user: { id: userId },
        chat_id: workflowToolsChat.id,
        dbs,
        serverName: server_name,
        toolName: name,
        toolArguments: args,
        clientReq,
      });
    });
  });

  return { workflowToolsHandler };
};
