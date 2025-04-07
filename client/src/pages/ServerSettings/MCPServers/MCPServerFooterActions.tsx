import { mdiReload } from "@mdi/js";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import { FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { CodeEditor } from "../../../dashboard/CodeEditor/CodeEditor";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerConfigButton } from "./MCPServerConfig";
import { MCPServersInstall } from "./MCPServersInstall";

type P = Pick<ServerSettingsProps, "dbs" | "dbsMethods"> & {
  r: DBSSchema["mcp_servers"] & {
    mcp_server_configs: DBSSchema["mcp_server_configs"][];
    mcp_server_logs: DBSSchema["mcp_server_logs"][];
  };
  setServerConfig: (arg: { name: string } | undefined) => void;
  envInfo:
    | {
        os: string;
        npmVersion: string;
        uvxVersion: string;
      }
    | undefined;
};
export const MCPServerFooterActions = ({
  r,
  dbs,
  dbsMethods,
  setServerConfig,
  envInfo,
}: P) => {
  const { reloadMcpServerTools } = dbsMethods;
  const { mcp_server_configs, config_schema } = r;
  const config: DBSSchema["mcp_server_configs"] | undefined =
    mcp_server_configs[0];
  const logItem: DBSSchema["mcp_server_logs"] | undefined =
    r.mcp_server_logs[0];
  return (
    <FlexRow className="jc-end">
      {r.source && (
        <MCPServersInstall name={r.name} dbs={dbs} dbsMethods={dbsMethods} />
      )}
      {logItem && (
        <PopupMenu
          title={`MCP Server ${JSON.stringify(r.name)} stderr logs`}
          positioning="center"
          className="mr-auto ml-p25"
          button={
            <Btn
              color={logItem.error ? "danger" : "default"}
              variant="faded"
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
      {config_schema && config && (
        <MCPServerConfigButton
          dbs={dbs}
          schema={config_schema}
          existingConfig={{ id: config.id, value: config.config }}
          serverName={r.name}
        />
      )}
      {reloadMcpServerTools && (
        <Btn
          iconPath={mdiReload}
          disabledInfo={r.enabled ? undefined : "Must enable server first"}
          title={"Reload tools"}
          onClickPromise={async () => {
            const toolCount = await reloadMcpServerTools(r.name);
            alert(`Reloaded ${toolCount || 0} tools`);
          }}
        />
      )}
      <SwitchToggle
        title={!r.enabled ? "Press to enable" : "Press to disable"}
        disabledInfo={
          (r.command === "npx" || r.command === "npm") && !envInfo?.npmVersion ?
            "Must install npm"
          : r.command === "uvx" && !envInfo?.uvxVersion ?
            "Must install uvx"
          : undefined
        }
        checked={!!r.enabled}
        onChange={(enabled) => {
          if (!r.enabled && r.config_schema && !r.mcp_server_configs.length) {
            setServerConfig({ name: r.name });
          } else {
            dbs.mcp_servers.update({ name: r.name }, { enabled });
          }
        }}
      />
    </FlexRow>
  );
};
