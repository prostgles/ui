import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import Chip from "../../../components/Chip";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu";
import { SwitchToggle } from "../../../components/SwitchToggle";
import SmartCardList from "../../../dashboard/SmartCard/SmartCardList";
import SmartForm from "../../../dashboard/SmartForm/SmartForm";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerConfig, MCPServerConfigButton } from "./MCPServerConfig";
import { MCPServersInstall } from "./MCPServersInstall";
import { mdiReload } from "@mdi/js";

export const MCPServers = ({
  theme,
  dbsMethods,
  dbs,
  dbsTables,
}: ServerSettingsProps) => {
  const [serverConfig, setServerConfig] = React.useState<{
    name: string;
  }>();
  const serverInfo = dbs.mcp_servers.useSubscribeOne(
    {
      name: serverConfig?.name,
    },
    {},
    { skip: !serverConfig?.name },
  );

  const { reloadMcpServerTools } = dbsMethods;

  return (
    <FlexCol className="p-1 min-w-0 f-1">
      <FlexRow>
        <PopupMenu
          button={
            <Btn variant="filled" color="action">
              Add MCP Server
            </Btn>
          }
          onClickClose={false}
          clickCatchStyle={{ opacity: 1 }}
        >
          <SmartForm
            theme={theme}
            db={dbs as any}
            methods={dbsMethods}
            tableName="mcp_servers"
            tables={dbsTables}
            showLocalChanges={false}
          />
        </PopupMenu>
      </FlexRow>
      <SmartCardList
        theme={theme}
        db={dbs as any}
        methods={dbsMethods}
        tableName="mcp_servers"
        tables={dbsTables}
        filter={{}}
        realtime={true}
        showTopBar={true}
        showEdit={true}
        noDataComponentMode="hide-all"
        noDataComponent={
          <InfoRow color="info" className="m-1 h-fit">
            No MCP servers. MCP servers can be added to allow LLM tool usage
          </InfoRow>
        }
        orderBy={{ name: true }}
        fieldConfigs={[
          {
            name: "name",
            label: "",
            className: "bold",
          },
          {
            name: "mcp_server_configs",
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
                    >
                      {tool.name}
                    </Chip>
                  ))}
                </FlexRowWrap>
              );
            },
          },
          {
            name: "installed",
            hide: true,
          },
          {
            name: "config_schema",
            hide: true,
          },
          {
            name: "enabled",
            hide: true,
          },
          {
            name: "source",
            hide: true,
          },
        ]}
        getRowFooter={(r) => {
          const { mcp_server_configs, config_schema } = r;
          const config: DBSSchema["mcp_server_configs"] | undefined =
            mcp_server_configs[0];
          return (
            <FlexRow className="jc-end">
              {r.source.type === "code" && (
                <MCPServersInstall
                  name={r.name}
                  dbs={dbs}
                  dbsMethods={dbsMethods}
                />
              )}
              {config_schema && config && (
                <MCPServerConfigButton
                  dbs={dbs}
                  schema={config_schema}
                  existingConfig={{ id: config.id, value: config.config }}
                  serverName={r.name}
                />
              )}
              {reloadMcpServerTools && r.enabled && (
                <Btn
                  iconPath={mdiReload}
                  title={"Reload tools"}
                  onClickPromise={async () => {
                    const toolCount = await reloadMcpServerTools(r.name);
                    alert(`Reloaded ${toolCount || 0} tools`);
                  }}
                />
              )}
              <SwitchToggle
                title={!r.enabled ? "Press to enable" : "Press to disable"}
                // disabledInfo={!r.installed ? "Must install MCP server first" : ""}
                checked={r.enabled}
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
  );
};
