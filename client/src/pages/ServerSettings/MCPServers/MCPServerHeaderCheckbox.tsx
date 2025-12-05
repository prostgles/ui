import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { SvgIcon } from "@components/SvgIcon";
import React, { useCallback } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import {
  useMCPServerEnable,
  type MCPServerChatContext,
} from "./MCPServerConfig/useMCPServerEnable";
import { MCPServerToolsGroupToggle } from "./MCPServerTools/MCPServerToolsGroupToggle";
import type { MCPServerWithToolAndConfigs } from "./useMCPServersListProps";
import { isDefined } from "src/utils/utils";

export const MCPServerHeaderCheckbox = ({
  mcpServer,
  dbs,
  chatContext,
}: {
  mcpServer: MCPServerWithToolAndConfigs;
  chatContext: MCPServerChatContext | undefined;
  dbs: DBS;
}) => {
  const { mcp_server_tools: mcpServerTools, icon_path } = mcpServer;
  const { llm_chats_allowed_mcp_tools, chatId } = chatContext ?? {};
  const toolsAllowed = llm_chats_allowed_mcp_tools?.filter((at) =>
    mcpServerTools.some((t) => t.id === at.tool_id),
  );
  const someToolsAllowed = !!toolsAllowed?.length;
  const name = mcpServer.name;
  const { onToggleTools } = useMCPServerEnable({
    dbs,
    mcp_server: mcpServer,
    chatContext,
  });

  const { onErrorAlert } = useOnErrorAlert();

  const onToggleServer = useCallback(() => {
    onErrorAlert(async () => {
      if (someToolsAllowed) {
        await onToggleTools(
          toolsAllowed.map((t) => t.tool_id),
          "remove",
        );
      } else {
        await onToggleTools(
          mcpServerTools.map((t) => t.id),
          "approve",
        );
      }
    });
  }, [
    mcpServerTools,
    onErrorAlert,
    onToggleTools,
    someToolsAllowed,
    toolsAllowed,
  ]);

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
          : () => onToggleServer()
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
