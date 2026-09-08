import type { DBSSchema } from "@common/publishUtils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiReload } from "@mdi/js";
import React from "react";
import { pluralise } from "src/pages/Connections/Connection";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { MCPServerConfigButton } from "../MCPServerConfig/MCPServerConfigButton";
import {
  useMCPServerEnable,
  type MCPServerChatContext,
} from "../MCPServerConfig/useMCPServerEnable";
import type { MCPServerWithToolAndConfigs } from "../useMCPServersListProps";
import { MCPServerLogs } from "./MCPServerLogs";
import { MCPServersInstall } from "./MCPServersInstall";

export type MCPServerFooterActionsProps = {
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
  envInfo,
  chatContext,
}: MCPServerFooterActionsProps) => {
  const { dbs, dbsMethods } = usePrglCore();
  const { reloadMcpServerTools } = dbsMethods;
  const { mcp_server_configs, config_schema } = mcp_server;

  const { onToggle } = useMCPServerEnable({
    dbs,
    mcp_server,
    chatContext,
  });
  const { addAlert } = useAlert();
  const { llm_chats_allowed_mcp_tools, chatId } = chatContext ?? {};

  /** Show active config for this chat. If no active tools then show last config */
  const activeConfig = mcp_server_configs.find((config) =>
    llm_chats_allowed_mcp_tools?.some(
      (t) =>
        t.server_name === mcp_server.name && t.server_config_id === config.id,
    ),
  );
  const configToShow = activeConfig ?? mcp_server_configs.at(-1);
  return (
    <FlexRow className="jc-end pl-p5">
      {mcp_server.source && <MCPServersInstall mcpServer={mcp_server} />}
      <MCPServerLogs mcpServer={mcp_server} />
      {configToShow && (
        <MCPServerConfigButton
          key={configToShow.id}
          schema={config_schema}
          existingConfig={configToShow}
          server={mcp_server}
          chatId={chatId}
          defaultConfig={configToShow.config}
        />
      )}
      {reloadMcpServerTools && (
        <Btn
          title={"Refresh tools"}
          data-command="MCPServerFooterActions.refreshTools"
          iconPath={mdiReload}
          disabledInfo={
            mcp_server.enabled ? undefined : "Must enable server first"
          }
          onClickPromiseMode="noTickIcon"
          onClickPromise={async () => {
            const toolCount = await reloadMcpServerTools({
              serverName: mcp_server.name,
            });
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
        onChange={async () => {
          await onToggle();
        }}
      />
    </FlexRow>
  );
};
