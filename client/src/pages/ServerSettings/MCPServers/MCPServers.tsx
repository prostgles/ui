import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { mdiCheck, mdiCheckAll } from "@mdi/js";
import { usePromise } from "prostgles-client";
import type { DBHandlerClient } from "prostgles-client";
import React, { useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { SmartCardList } from "../../../dashboard/SmartCardList/SmartCardList";
import type { ColumnSort } from "../../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import { MCPServerConfigProvider } from "./MCPServerConfig/MCPServerConfig";
import { MCPServerFooterActions } from "./MCPServerFooterActions/MCPServerFooterActions";
import { MCPServersHeader } from "./MCPServersHeader";
import { MCPServersToolbar } from "./MCPServersToolbar/MCPServersToolbar";
import {
  useMCPServersListProps,
  type MCPServerWithToolAndConfigs,
} from "./useMCPServersListProps";

export type MCPServersProps = {
  chatId: number | undefined;
};

export const MCPServers = ({ chatId }: MCPServersProps) => {
  const { dbsMethods, dbs, dbsMethodSchema, dbsTables, dbsSql } = usePrglCore();

  const { getMcpHostInfo } = dbsMethods;
  const envInfo = usePromise(async () => getMcpHostInfo?.(), [getMcpHostInfo]);
  const globalSettings = dbs.global_settings.useSubscribeOne();
  const { mcp_servers_disabled } = globalSettings.data ?? {};

  const { selectedTool, setSelectedTool, filter, fieldConfigs, chatContext } =
    useMCPServersListProps(chatId, dbs);
  const { llm_chats_allowed_mcp_tools } = chatContext || {};
  const someToolsAutoApproved = llm_chats_allowed_mcp_tools?.some(
    (t) => t.auto_approve,
  );

  const [loaded, setLoaded] = useState(false);
  return (
    <MCPServerConfigProvider dbs={dbs}>
      <FlexCol
        className="p-1 pt-0 min-w-0 f-1 max-w-800"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
        }}
      >
        <MCPServersHeader envInfo={envInfo} />
        <MCPServersToolbar
          chatId={chatId}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
        />
        <FlexCol
          {...(mcp_servers_disabled && {
            className: "disabled",
            title: "MCP Servers are disabled",
          })}
        >
          {chatId && llm_chats_allowed_mcp_tools && (
            <Btn
              variant="faded"
              data-command="MCPServers.toggleAutoApprove"
              title="Toggle auto-approve for selected tools. When enabled, all selected tools can be called without user approval"
              iconPath={someToolsAutoApproved ? mdiCheckAll : mdiCheck}
              color={"action"}
              onClickPromiseMode="noTickIcon"
              onClickPromise={async () => {
                await dbs.llm_chats_allowed_mcp_tools.update(
                  {
                    chat_id: chatId,
                    tool_id: {
                      $in: llm_chats_allowed_mcp_tools.map((t) => t.tool_id),
                    },
                  },
                  { auto_approve: !someToolsAutoApproved },
                );
              }}
            >
              Auto-approve: {someToolsAutoApproved ? "ON" : "OFF"}
            </Btn>
          )}
          <SmartCardList<MCPServerWithToolAndConfigs>
            sql={dbsSql}
            db={dbs as DBHandlerClient}
            methods={dbsMethodSchema}
            className={mcp_servers_disabled ? "no-interaction" : undefined}
            tableName="mcp_servers"
            realtime={true}
            showTopBar={false}
            noDataComponentMode="hide-all"
            noDataComponent={
              <InfoRow color="info" className="h-fit">
                No MCP servers. MCP servers can be added to allow LLM tool usage
              </InfoRow>
            }
            tables={dbsTables}
            filter={filter}
            orderBy={orderByEnabledAndName}
            fieldConfigs={fieldConfigs}
            enableListAnimations={true}
            onSetData={() => {
              setLoaded(true);
            }}
            getRowFooter={(r) => (
              <MCPServerFooterActions
                mcp_server={r}
                envInfo={envInfo}
                chatContext={chatContext}
              />
            )}
          />
        </FlexCol>
      </FlexCol>
    </MCPServerConfigProvider>
  );
};

const orderByEnabledAndName = [
  {
    key: "enabled",
    asc: false,
  },
  {
    key: "name",
    asc: true,
  },
] satisfies ColumnSort[];
