import { mdiCheck } from "@mdi/js";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import Chip from "../../../components/Chip";
import { ScrollFade } from "../../../components/SearchList/ScrollFade";
import { MCPServerConfig } from "./MCPServerConfig/MCPServerConfig";
import { useMCPServerEnable } from "./MCPServerConfig/useMCPServerEnable";

export const MCPServerTools = ({
  server,
  tools,
  llm_chats_allowed_mcp_tools,
  selectedToolName,
  chatId,
  dbs,
  dbsMethods,
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
} & Pick<Prgl, "dbs" | "dbsMethods">) => {
  const { onToggle, setShowServerConfig, showServerConfig } =
    useMCPServerEnable({
      dbs,
      mcp_server: server,
      dbsMethods,
    });

  return (
    <ScrollFade className="gap-p25 flex-row-wrap">
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
            color={isAllowed ? "blue" : undefined}
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
    </ScrollFade>
  );
};
