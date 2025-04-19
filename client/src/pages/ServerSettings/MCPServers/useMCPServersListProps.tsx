import React, { useMemo } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { MCPServerTools } from "./MCPServerTools";
import type { FieldConfig } from "../../../dashboard/SmartCard/SmartCard";

export const useMCPServersListProps = (
  chatId: number | undefined,
  dbs: DBS,
) => {
  const [selectedTool, setSelectedTool] =
    React.useState<DBSSchema["mcp_server_tools"]>();

  const { data: llm_chats_allowed_mcp_tools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe(
      {
        chat_id: chatId,
      },
      {
        select: {
          tool_id: 1,
        },
      },
      { skip: !chatId },
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
          className: "bold mx-p25 w-full",
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
            /** TODO: fix nested joins in prostgles-server */
            // llm_chats_allowed_mcp_tools: "*",
          },
          renderMode: "valueNode",
          render: (tools: DBSSchema["mcp_server_tools"][], server) => {
            return (
              <MCPServerTools
                server={server as any}
                llm_chats_allowed_mcp_tools={llm_chats_allowed_mcp_tools}
                tools={tools}
                selectedToolName={selectedTool?.name}
                chatId={chatId}
                dbs={dbs}
              />
            );
          },
        },
        ...["installed", "config_schema", "enabled", "source", "command"].map(
          (name) => ({
            name,
            hide: true,
          }),
        ),
      ] satisfies FieldConfig[],
    [chatId, dbs, llm_chats_allowed_mcp_tools, selectedTool?.name],
  );
  return {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
  };
};
