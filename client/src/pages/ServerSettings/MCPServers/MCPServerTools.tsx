import { mdiCheck, mdiCheckAll, mdiCheckboxBlankOutline } from "@mdi/js";
import React from "react";
import type { DBSSchema } from "../../../../../common/publishUtils";
import type { Prgl } from "../../../App";
import Chip from "../../../components/Chip";
import { ScrollFade } from "../../../components/ScrollFade/ScrollFade";
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
        auto_approve: boolean | null;
      }[]
    | undefined;
  selectedToolName: string | undefined;
  chatId: number | undefined;
} & Pick<Prgl, "dbs" | "dbsMethods">) => {
  const { onToggle } = useMCPServerEnable({
    dbs,
    mcp_server: server,
    dbsMethods,
  });

  return (
    <ScrollFade
      data-command="MCPServerTools"
      className="gap-p25 flex-row-wrap o-auto no-scroll-bar"
    >
      {tools.map((tool, i) => {
        const allowedTool = llm_chats_allowed_mcp_tools?.find(
          (at) => at.tool_id === tool.id,
        );
        return (
          <Chip
            key={`${tool.name}${i}`}
            title={tool.description}
            className={"pointer " + (allowedTool ? "bdb-active noselect" : "")}
            leftIcon={
              !chatId ? undefined
              : allowedTool ?
                {
                  path: allowedTool.auto_approve ? mdiCheckAll : mdiCheck,
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
            aria-checked={!!allowedTool}
            color={allowedTool ? "blue" : undefined}
            onClick={
              !chatId ? undefined : (
                async () => {
                  const data = {
                    tool_id: tool.id,
                    chat_id: chatId,
                  };
                  await dbs.llm_chats_allowed_mcp_tools.delete(data);
                  const checked = !allowedTool;
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
    </ScrollFade>
  );
};
