import { mdiCheck, mdiCheckboxBlankOutline } from "@mdi/js";
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
    <ScrollFade
      data-command="MCPServerTools"
      className="gap-p25 flex-row-wrap o-auto"
    >
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
              isAllowed ?
                {
                  path: mdiCheck,
                  style: {
                    marginRight: "0.25rem",
                  },
                  size: 0.75,
                }
              : {
                  path: mdiCheckboxBlankOutline,
                  style: {
                    marginRight: "0.25rem",
                    opacity: 0.25,
                  },
                  size: 0.75,
                }
            }
            aria-checked={isAllowed}
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
