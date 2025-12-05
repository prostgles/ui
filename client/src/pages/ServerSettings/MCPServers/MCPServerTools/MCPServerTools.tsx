import type { DBSSchema } from "@common/publishUtils";
import Chip from "@components/Chip";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiCheck, mdiCheckAll, mdiCheckboxBlankOutline } from "@mdi/js";
import React, { useMemo } from "react";
import type { Prgl } from "../../../../App";
import {
  useMCPServerEnable,
  type MCPServerChatContext,
} from "../MCPServerConfig/useMCPServerEnable";

export const MCPServerTools = ({
  server,
  tools,
  chatContext,
  dbs,
}: {
  server: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
  };
  tools: DBSSchema["mcp_server_tools"][];
  chatContext: MCPServerChatContext | undefined;
  selectedToolName: string | undefined;
} & Pick<Prgl, "dbs">) => {
  const { onToggleTools } = useMCPServerEnable({
    dbs,
    mcp_server: server,
    chatContext,
  });
  const { llm_chats_allowed_mcp_tools, chatId } = chatContext ?? {};

  const toolsSortedByReadonly = useMemo(
    () =>
      [...tools].toSorted((a, b) => {
        const aReadOnly = a.annotations?.readOnlyHint ? 1 : 0;
        const bReadOnly = b.annotations?.readOnlyHint ? 1 : 0;
        return bReadOnly - aReadOnly || a.name.localeCompare(b.name);
      }),
    [tools],
  );

  return (
    <ScrollFade
      data-command="MCPServerTools"
      className="gap-p25 flex-row-wrap o-auto no-scroll-bar"
    >
      {toolsSortedByReadonly.map((tool, i) => {
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
                  const checked = !allowedTool;
                  const data = {
                    tool_id: tool.id,
                    chat_id: chatId,
                    server_name: server.name,
                  };
                  // await dbs.llm_chats_allowed_mcp_tools.delete(data);
                  // const checked = !allowedTool;
                  // let wasEnabled = server.enabled;
                  // if (!server.enabled) {
                  //   wasEnabled = await onToggle();
                  // }
                  // if (checked && wasEnabled) {
                  //   await dbs.llm_chats_allowed_mcp_tools.insert(data);
                  // }
                  await onToggleTools(
                    [tool.id],
                    checked ? "approve" : "remove",
                  );
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
