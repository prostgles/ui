import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { SvgIcon } from "@components/SvgIcon";
import React, { useCallback } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import { useMCPServerEnable } from "./MCPServerConfig/useMCPServerEnable";
import { MCPServerToolsGroupToggle } from "./MCPServerTools/MCPServerToolsGroupToggle";
import type { MCPServerWithToolAndConfigs } from "./useMCPServersListProps";
import { isDefined } from "src/utils";

export const MCPServerHeaderCheckbox = ({
  mcpServer,
  llm_chats_allowed_mcp_tools,
  chatId,
  dbs,
}: {
  mcpServer: MCPServerWithToolAndConfigs;
  llm_chats_allowed_mcp_tools:
    | {
        auto_approve: boolean | null;
        tool_id: number;
      }[]
    | undefined;
  chatId: number | undefined;
  dbs: DBS;
}) => {
  const { mcp_server_tools: mcpServerTools, icon_path } = mcpServer;
  const toolsAllowed = llm_chats_allowed_mcp_tools?.filter((at) =>
    mcpServerTools.some((t) => t.id === at.tool_id),
  );
  const someToolsAllowed = !!toolsAllowed?.length;
  const name = mcpServer.name;
  const { onToggle, onToggleTools } = useMCPServerEnable({
    dbs,
    mcp_server: mcpServer,
    chatId,
  });

  const { onErrorAlert } = useOnErrorAlert();

  const onToggleServer = useCallback(
    (chatId: number) => {
      onErrorAlert(async () => {
        let wasEnabled = mcpServer.enabled;
        if (!mcpServer.enabled && !someToolsAllowed) {
          wasEnabled = await onToggle();
        }
        if (someToolsAllowed) {
          await dbs.llm_chats_allowed_mcp_tools.delete({
            chat_id: chatId,
            tool_id: {
              $in: toolsAllowed.map((t) => t.tool_id),
            },
          });
        } else if (wasEnabled) {
          await dbs.llm_chats_allowed_mcp_tools.insert(
            mcpServerTools.map((t) => ({
              chat_id: chatId,
              tool_id: t.id,
            })),
          );
        }
      });
    },
    [
      someToolsAllowed,
      onToggle,
      mcpServer.enabled,
      dbs,
      toolsAllowed,
      mcpServerTools,
      onErrorAlert,
    ],
  );

  return (
    <FlexRow className="bold mx-p25 w-full">
      <Btn
        title="Toggle all tools"
        style={{
          padding: "0",
          marginRight: "1em",
        }}
        iconNode={icon_path && <SvgIcon icon={icon_path} />}
        color={someToolsAllowed ? "action" : undefined}
        disabledInfo={
          mcpServerTools.length ? undefined : "No tools available. Press reload"
        }
        onClick={
          !chatId || !llm_chats_allowed_mcp_tools ?
            undefined
          : () => onToggleServer(chatId)
        }
      >
        {name}
      </Btn>

      {isDefined(chatId) && (
        <MCPServerToolsGroupToggle
          llm_chats_allowed_mcp_tools={llm_chats_allowed_mcp_tools}
          onToggleTools={onToggleTools}
          tools={mcpServerTools}
        />
      )}
    </FlexRow>
  );
};
