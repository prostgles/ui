import { mdiCheck, mdiCheckAll } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import { SmartCardList } from "../../../dashboard/SmartCardList/SmartCardList";
import type { ColumnSort } from "../../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerFooterActions } from "./MCPServerFooterActions/MCPServerFooterActions";
import { MCPServersHeader } from "./MCPServersHeader";
import { MCPServersToolbar } from "./MCPServersToolbar/MCPServersToolbar";
import {
  useMCPServersListProps,
  type MCPServerWithToolAndConfigs,
} from "./useMCPServersListProps";
import { MCPServerConfigProvider } from "./MCPServerConfig/MCPServerConfig";

export type MCPServersProps = Omit<ServerSettingsProps, "auth"> & {
  chatId: number | undefined;
};

export const MCPServers = (props: MCPServersProps) => {
  const { dbsMethods, dbs, dbsTables, chatId } = props;

  const { getMcpHostInfo } = dbsMethods;
  const envInfo = usePromise(async () => getMcpHostInfo?.(), [getMcpHostInfo]);
  const globalSettings = dbs.global_settings.useSubscribeOne();
  const { mcp_servers_disabled } = globalSettings.data ?? {};

  const {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
    llm_chats_allowed_mcp_tools,
  } = useMCPServersListProps(chatId, dbs);

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
          {...props}
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
            db={dbs as DBHandlerClient}
            methods={dbsMethods}
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
                dbs={dbs}
                dbsMethods={dbsMethods}
                envInfo={envInfo}
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
