import { mdiReload } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import Chip from "../../../components/Chip";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu";
import { SwitchToggle } from "../../../components/SwitchToggle";
import { CodeEditor } from "../../../dashboard/CodeEditor/CodeEditor";
import SmartCardList from "../../../dashboard/SmartCard/SmartCardList";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerConfig, MCPServerConfigButton } from "./MCPServerConfig";
import { MCPServersHeader } from "./MCPServersHeader";
import { MCPServersInstall } from "./MCPServersInstall";

export const MCPServers = (props: ServerSettingsProps) => {
  const [serverConfig, setServerConfig] = React.useState<{
    name: string;
  }>();
  const { dbsMethods, dbs, dbsTables } = props;
  const serverInfo = dbs.mcp_servers.useSubscribeOne(
    {
      name: serverConfig?.name,
    },
    {},
    { skip: !serverConfig?.name },
  );
  const [selectedTool, setSelectedTool] =
    React.useState<DBSSchema["mcp_server_tools"]>();
  const { reloadMcpServerTools, getMcpHostInfo } = dbsMethods;
  const globalSettings = dbs.global_settings.useSubscribeOne();
  const { mcp_servers_disabled } = globalSettings.data ?? {};
  const envInfo = usePromise(async () => getMcpHostInfo?.(), [getMcpHostInfo]);
  const missing =
    !envInfo ? undefined
    : !envInfo.npmVersion ?
      <>
        npm not installed. Visit{" "}
        <a href="https://nodejs.org/en/download">
          https://nodejs.org/en/download
        </a>
      </>
    : !envInfo.uvxVersion ?
      <>
        uvx not installed. Visit{" "}
        <a href="https://docs.astral.sh/uv/getting-started/installation/">
          https://docs.astral.sh/uv/getting-started/installation/
        </a>
      </>
    : "";

  return (
    <FlexCol className="p-1 pt-0 min-w-0 f-1">
      <InfoRow className="mb-1" variant="naked" color="info" iconPath="">
        Pre-built integrations that can be used through the Ask AI chat and
        server-side functions. For more information visit{" "}
        <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
      </InfoRow>
      {missing && <InfoRow>{missing}</InfoRow>}
      <MCPServersHeader
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
        <SmartCardList
          db={dbs as DBHandlerClient}
          methods={dbsMethods}
          {...(mcp_servers_disabled && {
            className: "no-interaction",
          })}
          tableName="mcp_servers"
          tables={dbsTables}
          filter={
            selectedTool && {
              name: selectedTool.server_name,
            }
          }
          realtime={true}
          showTopBar={false}
          // showEdit={false}
          noDataComponentMode="hide-all"
          noDataComponent={
            <InfoRow color="info" className="m-1 h-fit">
              No MCP servers. MCP servers can be added to allow LLM tool usage
            </InfoRow>
          }
          orderBy={{ enabled: false, name: true }}
          fieldConfigs={[
            {
              name: "name",
              label: "",
              className: "bold mx-p25",
            },
            {
              name: "mcp_server_configs",
              select: "*",
            },
            {
              name: "mcp_server_logs",
              select: "*",
            },
            {
              name: "mcp_server_tools",
              select: {
                name: 1,
                description: 1,
              },
              render: (tools) => {
                return (
                  <FlexRowWrap className="gap-p25">
                    {tools.map((tool, i) => (
                      <Chip
                        key={`${tool.name}${i}`}
                        title={tool.description}
                        className="pointer"
                        color={
                          selectedTool && selectedTool.name === tool.name ?
                            "blue"
                          : undefined
                        }
                      >
                        {tool.name}
                      </Chip>
                    ))}
                  </FlexRowWrap>
                );
              },
            },
            ...[
              "installed",
              "config_schema",
              "enabled",
              "source",
              "command",
            ].map((name) => ({
              name,
              hide: true,
            })),
          ]}
          getRowFooter={(
            r: DBSSchema["mcp_servers"] & {
              mcp_server_configs: DBSSchema["mcp_server_configs"][];
              mcp_server_logs: DBSSchema["mcp_server_logs"][];
            },
          ) => {
            const { mcp_server_configs, config_schema } = r;
            const config: DBSSchema["mcp_server_configs"] | undefined =
              mcp_server_configs[0];
            const logItem: DBSSchema["mcp_server_logs"] | undefined =
              r.mcp_server_logs[0];
            return (
              <FlexRow className="jc-end">
                {r.source && (
                  <MCPServersInstall
                    name={r.name}
                    dbs={dbs}
                    dbsMethods={dbsMethods}
                  />
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
                    disabledInfo={
                      r.enabled ? undefined : "Must enable server first"
                    }
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
                    (
                      (r.command === "npx" || r.command === "npm") &&
                      !envInfo?.npmVersion
                    ) ?
                      "Must install npm"
                    : r.command === "uvx" && !envInfo?.uvxVersion ?
                      "Must install uvx"
                    : undefined
                  }
                  checked={!!r.enabled}
                  onChange={(enabled) => {
                    if (
                      !r.enabled &&
                      r.config_schema &&
                      !r.mcp_server_configs.length
                    ) {
                      setServerConfig({ name: r.name });
                    } else {
                      dbs.mcp_servers.update({ name: r.name }, { enabled });
                    }
                  }}
                />
              </FlexRow>
            );
          }}
        />
        {serverInfo.data?.config_schema && serverConfig && (
          <MCPServerConfig
            existingConfig={undefined}
            schema={serverInfo.data.config_schema}
            dbs={dbs}
            onDone={() => setServerConfig(undefined)}
            serverName={serverConfig.name}
          />
        )}
      </FlexCol>
    </FlexCol>
  );
};
