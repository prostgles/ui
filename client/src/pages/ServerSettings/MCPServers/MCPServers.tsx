import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useMemo } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Chip from "../../../components/Chip";
import { FlexCol, FlexRowWrap } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import { SmartCardList } from "../../../dashboard/SmartCardList/SmartCardList";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerConfig } from "./MCPServerConfig";
import { MCPServerFooterActions } from "./MCPServerFooterActions";
import { MCPServersHeader } from "./MCPServersHeader";

const orderByEnabledAndName = {
  // enabled: false,
  // name: true
  key: "enabled",
  asc: false,
} as const;
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

  const { getMcpHostInfo } = dbsMethods;
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
  const { selectedTool, setSelectedTool, filter, fieldConfigs } =
    useListProps();

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
          className={mcp_servers_disabled ? "no-interaction" : undefined}
          tableName="mcp_servers"
          realtime={true}
          showTopBar={false}
          noDataComponentMode="hide-all"
          noDataComponent={
            <InfoRow color="info" className="m-1 h-fit">
              No MCP servers. MCP servers can be added to allow LLM tool usage
            </InfoRow>
          }
          tables={dbsTables}
          filter={filter}
          orderBy={orderByEnabledAndName}
          fieldConfigs={fieldConfigs}
          enableListAnimations={true}
          getRowFooter={(
            r: DBSSchema["mcp_servers"] & {
              mcp_server_configs: DBSSchema["mcp_server_configs"][];
              mcp_server_logs: DBSSchema["mcp_server_logs"][];
            },
          ) => (
            <MCPServerFooterActions
              r={r}
              dbs={dbs}
              dbsMethods={dbsMethods}
              envInfo={envInfo}
              setServerConfig={setServerConfig}
            />
          )}
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

const useListProps = () => {
  const [selectedTool, setSelectedTool] =
    React.useState<DBSSchema["mcp_server_tools"]>();

  const filter = useMemo(() => {
    return (
      selectedTool && {
        name: selectedTool.server_name,
      }
    );
  }, [selectedTool]);

  const fieldConfigs = useMemo(
    () => [
      {
        name: "name",
        label: "",
        className: "bold mx-p25 w-full",
      },
      {
        name: "mcp_server_configs",
        select: "*",
        hide: true,
      },
      {
        name: "mcp_server_logs",
        select: "*",
        hide: true,
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
      ...["installed", "config_schema", "enabled", "source", "command"].map(
        (name) => ({
          name,
          hide: true,
        }),
      ),
    ],
    [selectedTool],
  );
  // const getRowFooter: SmartCardListProps["getRowFooter"] = useCallback(
  //   () =>
  //     (
  //       r: DBSSchema["mcp_servers"] & {
  //         mcp_server_configs: DBSSchema["mcp_server_configs"][];
  //         mcp_server_logs: DBSSchema["mcp_server_logs"][];
  //       },
  //     ) => (
  //       <MCPServerFooterActions
  //         r={r}
  //         dbs={dbs}
  //         dbsMethods={dbsMethods}
  //         envInfo={envInfo}
  //         setServerConfig={setServerConfig}
  //       />
  //     ),
  //   [],
  // );
  return {
    selectedTool,
    setSelectedTool,
    filter,
    fieldConfigs,
    // getRowFooter,
  };
};
