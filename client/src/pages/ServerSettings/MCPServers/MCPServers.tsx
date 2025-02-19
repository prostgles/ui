import React from "react";
import { FlexCol, FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import Btn from "../../../components/Btn";
import SmartForm from "../../../dashboard/SmartForm/SmartForm";
import SmartCardList from "../../../dashboard/SmartCard/SmartCardList";
import { InfoRow } from "../../../components/InfoRow";
import type { ServerSettingsProps } from "../ServerSettings";
import { usePromise } from "prostgles-client/dist/react-hooks";

export const MCPServers = ({
  theme,
  dbsMethods,
  dbs,
  dbsTables,
}: ServerSettingsProps) => {
  const mcpServerStatus = usePromise(async () =>
    dbsMethods.getMCPServersStatus?.(),
  );

  return (
    <FlexCol className="p-1">
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
        <Btn
          className="ml-auto"
          variant="faded"
          color={"action"}
          onClickPromise={async () => {
            return dbsMethods.installMCPServers?.();
          }}
        >
          {mcpServerStatus?.ok ? "Re-Install" : "Install"} servers
        </Btn>
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
      />
    </FlexCol>
  );
};
