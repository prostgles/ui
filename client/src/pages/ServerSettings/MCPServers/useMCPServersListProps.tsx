import type { DBSSchema } from "@common/publishUtils";
import React, { useMemo, useState } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import type { FieldConfig } from "../../../dashboard/SmartCard/SmartCard";
import { MCPServerHeaderCheckbox } from "./MCPServerHeaderCheckbox";
import { MCPServerTools } from "./MCPServerTools/MCPServerTools";

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

  const { data: llm_chats_allowed_mcp_tools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(
      {
        chat_id: chatId,
      },
      {
        select: {
          tool_id: 1,
          auto_approve: 1,
        },
      },
    );
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
              chatId={chatId}
              dbs={dbs}
              llm_chats_allowed_mcp_tools={llm_chats_allowed_mcp_tools}
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
                llm_chats_allowed_mcp_tools={llm_chats_allowed_mcp_tools}
                tools={tools}
                selectedToolName={selectedTool?.name}
                chatId={chatId}
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
    [chatId, dbs, llm_chats_allowed_mcp_tools, selectedTool?.name],
  );
  return {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
    llm_chats_allowed_mcp_tools,
  };
};
