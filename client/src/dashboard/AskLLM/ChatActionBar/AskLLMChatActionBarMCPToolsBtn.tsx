import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiClose, mdiTools } from "@mdi/js";
import type { FilterItem } from "prostgles-types";
import React, { useEffect, useMemo, useState } from "react";
import type { Prgl } from "../../../App";
import { MCPServerConfig } from "../../../pages/ServerSettings/MCPServers/MCPServerConfig/MCPServerConfig";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarMCPToolsBtn = ({
  dbs,
  activeChat,
  loading,
  dbsMethods,
}: Pick<Prgl, "dbs" | "dbsMethods"> & {
  loading: boolean;
  activeChat: DBSSchema["llm_chats"];
}) => {
  const { data: allowedTools } = dbs.mcp_server_tools.useSubscribe(
    {
      $existsJoined: {
        "llm_chats_allowed_mcp_tools.llm_chats": {
          id: activeChat.id,
        },
      },
    } as FilterItem,
    {
      select: {
        name: 1,
        server_name: 1,
      },
    },
  );

  const allowedMcpServerNames = useMemo(
    () =>
      Array.from(new Set(allowedTools?.map((tool) => tool.server_name) ?? [])),
    [allowedTools],
  );

  const [serverToConfigure, setServerToConfigure] =
    useState<DBSSchema["mcp_servers"]>();

  const { data: mcpServersThatNeedEnabling } = dbs.mcp_servers.useFind(
    {
      enabled: false,
      name: { $in: allowedMcpServerNames },
    },
    {},
    { deps: [serverToConfigure] },
  );

  useEffect(() => {
    const canBeEnabledServers = mcpServersThatNeedEnabling?.filter(
      (server) => !server.config_schema,
    );
    if (!canBeEnabledServers?.length) {
      return;
    }
    void dbs.mcp_servers.update(
      {
        name: { $in: canBeEnabledServers.map((s) => s.name) },
      },
      { enabled: true },
    );
  }, [dbs.mcp_servers, mcpServersThatNeedEnabling]);

  const mcpServersThatConfiguring = mcpServersThatNeedEnabling?.filter(
    (server) => server.config_schema,
  );

  const btnRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Btn
        _ref={btnRef}
        title={`MCP Tools Allowed in this chat${
          allowedTools?.length ?
            `: \n\n${allowedTools.map((t) => t.name).join("\n")}`
          : ""
        }`}
        {...ChatActionBarBtnStyleProps}
        color={
          mcpServersThatConfiguring?.length ? "danger"
          : allowedTools?.length ?
            "action"
          : undefined
        }
        iconPath={mdiTools}
        loading={loading}
        disabledInfo={!dbsMethods.getMcpHostInfo ? "Must be admin" : undefined}
        children={allowedTools?.length || null}
      />
      {!!mcpServersThatConfiguring?.length &&
        !serverToConfigure &&
        btnRef.current && (
          <Popup
            title="MCP Servers Not Configured"
            contentClassName="p-2 gap-2 flex-col"
            onClose={() => {
              setServerToConfigure(undefined);
            }}
            positioning="center"
            anchorEl={btnRef.current}
            clickCatchStyle={{ opacity: 1 }}
          >
            <div className="ta-start font-18">
              Some of the MCP servers allowed for this chat are not configured.
            </div>
            <ScrollFade className="flex-col gap-1 o-auto">
              {mcpServersThatConfiguring.map((server) => (
                <FlexRow
                  key={server.name}
                  className="pl-1 pr-p5 py-p5 b b-color rounded"
                >
                  <div className="ta-start font-20 bold mr-2 f-1">
                    {server.name}
                  </div>
                  <Btn
                    title="Configure and enable MCP server"
                    variant="filled"
                    color="action"
                    iconPath={mdiTools}
                    onClick={() => {
                      setServerToConfigure(server);
                    }}
                  >
                    Configure
                  </Btn>
                  <Btn
                    iconPath={mdiClose}
                    title="Remove MCP server from chat"
                    onClickPromise={async () => {
                      await dbs.llm_chats_allowed_mcp_tools.delete({
                        chat_id: activeChat.id,
                        $existsJoined: {
                          "mcp_server_tools.mcp_servers": {
                            name: server.name,
                          },
                        },
                      } as FilterItem);
                    }}
                  />
                </FlexRow>
              ))}
            </ScrollFade>
          </Popup>
        )}
      {serverToConfigure && (
        <MCPServerConfig
          chatId={activeChat.id}
          existingConfig={undefined}
          dbs={dbs}
          onDone={() => {
            setServerToConfigure(undefined);
          }}
          serverName={serverToConfigure.name}
        />
      )}
    </>
  );
};
