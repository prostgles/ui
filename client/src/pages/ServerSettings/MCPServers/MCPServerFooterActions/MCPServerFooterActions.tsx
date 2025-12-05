import { mdiReload } from "@mdi/js";
import React from "react";
import type { DBSSchema } from "@common/publishUtils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { SwitchToggle } from "@components/SwitchToggle";
import { CodeEditor } from "../../../../dashboard/CodeEditor/CodeEditor";
import type { ServerSettingsProps } from "../../ServerSettings";
import { MCPServerConfigButton } from "../MCPServerConfig/MCPServerConfigButton";
import {
  useMCPServerEnable,
  type MCPServerChatContext,
} from "../MCPServerConfig/useMCPServerEnable";
import type { MCPServerWithToolAndConfigs } from "../useMCPServersListProps";
import { MCPServersInstall } from "./MCPServersInstall";
import { pluralise } from "src/pages/Connections/Connection";

export type MCPServerFooterActionsProps = Pick<
  ServerSettingsProps,
  "dbs" | "dbsMethods"
> & {
  mcp_server: MCPServerWithToolAndConfigs;
  envInfo:
    | {
        os: string;
        npmVersion: string;
        uvxVersion: string;
      }
    | undefined;
  chatContext: MCPServerChatContext | undefined;
};
export const MCPServerFooterActions = ({
  mcp_server,
  dbs,
  dbsMethods,
  envInfo,
  chatContext,
}: MCPServerFooterActionsProps) => {
  const { reloadMcpServerTools } = dbsMethods;
  const { mcp_server_configs, config_schema } = mcp_server;
  const logItem: DBSSchema["mcp_server_logs"] | undefined =
    mcp_server.mcp_server_logs[0];

  const { onToggle } = useMCPServerEnable({
    dbs,
    mcp_server,
    chatContext,
  });
  const { addAlert } = useAlert();
  const { llm_chats_allowed_mcp_tools, chatId } = chatContext ?? {};
  return (
    <FlexRow className="jc-end pl-p5">
      {mcp_server.source && (
        <MCPServersInstall
          mcpServer={mcp_server}
          dbs={dbs}
          dbsMethods={dbsMethods}
        />
      )}
      {logItem &&
        Boolean(
          logItem.log || logItem.install_log || logItem.install_error,
        ) && (
          <PopupMenu
            title={`MCP Server ${JSON.stringify(mcp_server.name)} stderr logs`}
            positioning="center"
            // className="mr-auto ml-p25"
            data-command="MCPServerFooterActions.logs"
            showFullscreenToggle={{}}
            button={
              <Btn
                color={logItem.error ? "danger" : "default"}
                // variant="faded"
                size="small"
              >
                {logItem.error ? "Error" : "Logs"}
              </Btn>
            }
            onClickClose={false}
            clickCatchStyle={{ opacity: 1 }}
          >
            <CodeEditor
              language={"bash"}
              value={logItem.log}
              style={{
                minWidth: "min(900px, 100vw)",
                minHeight: "min(900px, 100vh)",
              }}
            />
          </PopupMenu>
        )}
      {config_schema &&
        mcp_server_configs.map((config, index) => {
          const isLast = index === mcp_server_configs.length - 1;

          /** Show active config for this chat. If not active tools then show last config */
          if (
            llm_chats_allowed_mcp_tools && llm_chats_allowed_mcp_tools.length ?
              !llm_chats_allowed_mcp_tools.some(
                (t) =>
                  t.server_name === mcp_server.name &&
                  t.server_config_id === config.id,
              )
            : !isLast
          ) {
            return null;
          }
          return (
            <MCPServerConfigButton
              key={config.id}
              dbs={dbs}
              schema={config_schema}
              existingConfig={{ id: config.id, value: config.config }}
              serverName={mcp_server.name}
              chatId={chatId}
            />
          );
        })}
      {reloadMcpServerTools && (
        <Btn
          title={"Refresh tools"}
          data-command="MCPServerFooterActions.refreshTools"
          iconPath={mdiReload}
          disabledInfo={
            mcp_server.enabled ? undefined : "Must enable server first"
          }
          onClickPromise={async () => {
            const toolCount = await reloadMcpServerTools(mcp_server.name);
            addAlert(
              `Reloaded ${toolCount || 0} ${pluralise(toolCount, "tool")} for ${JSON.stringify(mcp_server.name)} server`,
            );
          }}
        />
      )}
      <SwitchToggle
        data-command="MCPServerFooterActions.enableToggle"
        title={!mcp_server.enabled ? "Press to enable" : "Press to disable"}
        disabledInfo={
          (
            (mcp_server.command === "npx" || mcp_server.command === "npm") &&
            !envInfo?.npmVersion
          ) ?
            "Must install npm"
          : mcp_server.command === "uvx" && !envInfo?.uvxVersion ?
            "Must install uvx"
          : undefined
        }
        checked={!!mcp_server.enabled}
        onChange={onToggle}
      />
    </FlexRow>
  );
};
