import React, { useMemo } from "react";
import type { DBS } from "../../../dashboard/Dashboard/DBS";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { MCPServerTools } from "./MCPServerTools";
import type { FieldConfig } from "../../../dashboard/SmartCard/SmartCard";
import type { Prgl } from "../../../App";
import { FlexRow } from "../../../components/Flex";
import Checkbox from "../../../components/Checkbox";

export const useMCPServersListProps = (
  chatId: number | undefined,
  dbs: DBS,
  dbsMethods: Prgl["dbsMethods"],
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
          render: (name: string, mcpServer) => {
            const mcpServerTools =
              mcpServer.mcp_server_tools as DBSSchema["mcp_server_tools"][];
            const someToolsAllowed = !!llm_chats_allowed_mcp_tools?.some((at) =>
              mcpServerTools.some((t) => t.id === at.tool_id),
            );

            return (
              <FlexRow className="bold mx-p25 w-full">
                {chatId && llm_chats_allowed_mcp_tools ?
                  <Checkbox
                    variant="header"
                    title="Toggle all tools"
                    className="m-0"
                    label={name}
                    checked={someToolsAllowed}
                    onChange={() => {
                      if (someToolsAllowed) {
                        dbs.llm_chats_allowed_mcp_tools.delete({
                          chat_id: chatId,
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
                : name}
              </FlexRow>
            );
          },
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
          className: "o-unset",
          render: (tools: DBSSchema["mcp_server_tools"][], server) => {
            return (
              <MCPServerTools
                server={server as any}
                llm_chats_allowed_mcp_tools={llm_chats_allowed_mcp_tools}
                tools={tools}
                selectedToolName={selectedTool?.name}
                chatId={chatId}
                dbs={dbs}
                dbsMethods={dbsMethods}
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
    [
      chatId,
      dbs,
      dbsMethods,
      llm_chats_allowed_mcp_tools,
      selectedTool?.id,
      selectedTool?.name,
    ],
  );
  return {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
  };
};
