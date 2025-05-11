import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import { FlexCol } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import { SmartCardList } from "../../../dashboard/SmartCardList/SmartCardList";
import type { ColumnSort } from "../../../dashboard/W_Table/ColumnMenu/ColumnMenu";
import type { ServerSettingsProps } from "../ServerSettings";
import { MCPServerConfig } from "./MCPServerConfig/MCPServerConfig";
import { MCPServerFooterActions } from "./MCPServerFooterActions";
import { MCPServersHeader } from "./MCPServersHeader";
import { useMCPServersListProps } from "./useMCPServersListProps";

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
export type MCPServersProps = Omit<ServerSettingsProps, "auth"> & {
  chatId: number | undefined;
};
export const MCPServers = (props: MCPServersProps) => {
  const { dbsMethods, dbs, dbsTables, chatId } = props;

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
    useMCPServersListProps(chatId, dbs, dbsMethods);

  const [loaded, setLoaded] = React.useState(false);

  return (
    <FlexCol
      className="p-1 pt-0 min-w-0 f-1 max-w-800"
      style={{
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
      }}
    >
      <InfoRow className="mb-1" variant="naked" color="info" iconPath="">
        Pre-built integrations that can be used through the Ask AI chat and
        server-side functions. For more information visit{" "}
        <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>.
        <br></br>
        <br></br>
        Enabled MCP servers are available to chats after adding them in the
        &quot;Allowed MCP Tools&quot; section of the chat settings.
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
          onSetData={() => {
            setLoaded(true);
          }}
          getRowFooter={(
            r: DBSSchema["mcp_servers"] & {
              mcp_server_configs: DBSSchema["mcp_server_configs"][];
              mcp_server_logs: DBSSchema["mcp_server_logs"][];
            },
          ) => (
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
  );
};
