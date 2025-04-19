import React, { useState } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { FlexRowWrap } from "../../../components/Flex";
import Chip from "../../../components/Chip";
import { mdiCheck } from "@mdi/js";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import Popup from "../../../components/Popup/Popup";
import { InfoRow } from "../../../components/InfoRow";
import { MCPServerConfig, useMCPServerEnable } from "./MCPServerConfig";

export const MCPServerTools = ({
  server,
  tools,
  llm_chats_allowed_mcp_tools,
  selectedToolName,
  chatId,
  dbs,
}: {
  server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
  tools: DBSSchema["mcp_server_tools"][];
  llm_chats_allowed_mcp_tools:
    | {
        tool_id: number;
      }[]
    | undefined;
  selectedToolName: string | undefined;
  chatId: number | undefined;
  dbs: DBS;
}) => {
  const { onToggle, setShowServerConfig, showServerConfig } =
    useMCPServerEnable({
      dbs,
      mcp_server: server,
    });

  return (
    <FlexRowWrap className="gap-p25">
      {tools.map((tool, i) => {
        const isAllowed = llm_chats_allowed_mcp_tools?.some(
          (at) => at.tool_id === tool.id,
        );
        return (
          <Chip
            key={`${tool.name}${i}`}
            title={tool.description}
            className={"pointer " + (isAllowed ? "bdb-active noselect" : "")}
            leftIcon={
              !isAllowed ? undefined : (
                {
                  path: mdiCheck,
                  size: 0.75,
                }
              )
            }
            color={
              isAllowed || selectedToolName === tool.name ? "blue" : undefined
            }
            onClick={
              !chatId ? undefined : (
                async () => {
                  const data = {
                    tool_id: tool.id,
                    chat_id: chatId,
                  };
                  await dbs.llm_chats_allowed_mcp_tools.delete(data);
                  const checked = !isAllowed;
                  if (!server.enabled) {
                    await onToggle();
                  }
                  if (checked) {
                    await dbs.llm_chats_allowed_mcp_tools.insert(data);
                  }
                }
              )
            }
          >
            {tool.name}
          </Chip>
        );
      })}
      {showServerConfig && (
        <MCPServerConfig
          dbs={dbs}
          existingConfig={undefined}
          serverName={server.name}
          onDone={() => setShowServerConfig(false)}
        />
      )}
    </FlexRowWrap>
  );
};
