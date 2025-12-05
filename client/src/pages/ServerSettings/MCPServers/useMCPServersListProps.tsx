import type { DBSSchema } from "@common/publishUtils";
import React, { useMemo, useState } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import type { FieldConfig } from "../../../dashboard/SmartCard/SmartCard";
import { MCPServerHeaderCheckbox } from "./MCPServerHeaderCheckbox";
import { MCPServerTools } from "./MCPServerTools/MCPServerTools";
import { useMCPChatAllowedTools } from "./useMCPChatAllowedTools";
import { isDefined } from "@common/filterUtils";

export type MCPServerWithToolAndConfigs = DBSSchema["mcp_servers"] & {
  mcp_server_tools: DBSSchema["mcp_server_tools"][];
  mcp_server_configs: DBSSchema["mcp_server_configs"][];
  mcp_server_logs: DBSSchema["mcp_server_logs"][];
};

export const useMCPServersListProps = (
  chatId: number | undefined,
  dbs: DBS,
) => {
  const [selectedTool, setSelectedTool] =
    useState<DBSSchema["mcp_server_tools"]>();

  const { llm_chats_allowed_mcp_tools } = useMCPChatAllowedTools(dbs, chatId);
  const chatContext = useMemo(() => {
    if (isDefined(chatId) && llm_chats_allowed_mcp_tools) {
      return {
        chatId,
        llm_chats_allowed_mcp_tools,
      };
    }
    return undefined;
  }, [chatId, llm_chats_allowed_mcp_tools]);

  const filter = useMemo(() => {
    return (
      selectedTool && {
        name: selectedTool.server_name,
      }
    );
  }, [selectedTool]);

  const fieldConfigs = useMemo(
    () =>
      [
        {
          name: "name",
          label: "",
          renderMode: "full",
          render: (_, mcpServer) => (
            <MCPServerHeaderCheckbox
              mcpServer={mcpServer}
              chatContext={chatContext}
              dbs={dbs}
            />
          ),
        },
        {
          name: "mcp_server_configs",
          select: "*",
          hide: true,
        },
        {
          name: "mcp_server_logs",
          select: "*",
          hide: true,
        },
        {
          name: "mcp_server_tools",
          select: {
            id: 1,
            name: 1,
            description: 1,
            annotations: 1,
            /** TODO: fix nested joins in prostgles-server */
            // llm_chats_allowed_mcp_tools: "*",
          },
          renderMode: "valueNode",
          className: "o-unset",
          render: (tools: DBSSchema["mcp_server_tools"][], server) => {
            return (
              <MCPServerTools
                server={server}
                tools={tools}
                selectedToolName={selectedTool?.name}
                chatContext={chatContext}
                dbs={dbs}
              />
            );
          },
        },
        ...(
          [
            "installed",
            "config_schema",
            "enabled",
            "source",
            "command",
            "icon_path",
          ] as const
        ).map((name) => ({
          name,
          hide: true,
        })),
      ] satisfies FieldConfig<MCPServerWithToolAndConfigs>[],
    [chatContext, dbs, selectedTool?.name],
  );

  return {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
    chatContext,
  };
};
