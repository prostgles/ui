import { mdiCheckAll } from "@mdi/js";
import React from "react";
import Checkbox from "../../../components/Checkbox";
import { FlexRow } from "../../../components/Flex";
import type { DBS, DBSMethods } from "../../../dashboard/Dashboard/DBS";
import { useMCPServerEnable } from "./MCPServerConfig/useMCPServerEnable";
import type { MCPServerWithToolAndConfigs } from "./useMCPServersListProps";

export const MCPServerHeaderCheckbox = ({
  mcpServer,
  llm_chats_allowed_mcp_tools,
  chatId,
  dbs,
  dbsMethods,
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
  dbsMethods: DBSMethods;
}) => {
  const mcpServerTools = mcpServer.mcp_server_tools;
  const toolsAllowed = llm_chats_allowed_mcp_tools?.filter((at) =>
    mcpServerTools.some((t) => t.id === at.tool_id),
  );
  const someToolsAllowed = !!toolsAllowed?.length;
  const name = mcpServer.name;
  const { onToggle } = useMCPServerEnable({
    dbs,
    mcp_server: mcpServer,
    dbsMethods,
  });
  return (
    <FlexRow className="bold mx-p25 w-full">
      {chatId && llm_chats_allowed_mcp_tools ?
        <>
          <Checkbox
            variant="header"
            title="Toggle all tools"
            className="m-0"
            label={name}
            checked={someToolsAllowed}
            iconPath={
              toolsAllowed?.some((t) => t.auto_approve) ?
                mdiCheckAll
              : undefined
            }
            disabledInfo={
              mcpServerTools.length ? undefined : (
                "No tools available. Press reload"
              )
            }
            onChange={async () => {
              if (!mcpServer.enabled && !someToolsAllowed) {
                await onToggle();
              }
              if (someToolsAllowed) {
                dbs.llm_chats_allowed_mcp_tools.delete({
                  chat_id: chatId,
                  tool_id: {
                    $in: toolsAllowed.map((t) => t.tool_id),
                  },
                });
              } else {
                dbs.llm_chats_allowed_mcp_tools.insert(
                  mcpServerTools.map((t) => ({
                    chat_id: chatId,
                    tool_id: t.id,
                  })),
                );
              }
            }}
          />
        </>
      : name}
    </FlexRow>
  );
};
