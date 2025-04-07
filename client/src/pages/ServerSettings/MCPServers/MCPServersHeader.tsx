import { mdiFilter, mdiMagnify, mdiPlus } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import { FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import Select from "../../../components/Select/Select";
import { SmartForm } from "../../../dashboard/SmartForm/SmartForm";
import type { ServerSettingsProps } from "../ServerSettings";

export const MCPServersHeader = ({
  dbsMethods,
  dbs,
  dbsTables,
  selectedTool,
  setSelectedTool,
}: ServerSettingsProps & {
  selectedTool: undefined | DBSSchema["mcp_server_tools"];
  setSelectedTool: (tool: undefined | DBSSchema["mcp_server_tools"]) => void;
}) => {
  const { data: tools } = dbs.mcp_server_tools.useFind();
  const globalSettings = dbs.global_settings.useSubscribeOne();

  const [showAddServer, setShowAddServer] = React.useState(false);

  return (
    <>
      {showAddServer && (
        <SmartForm
          asPopup={true}
          label="Add MCP Server"
          db={dbs as DBHandlerClient}
          methods={dbsMethods}
          onClose={() => setShowAddServer(false)}
          columnFilter={(c) =>
            [
              "name",
              "info",
              "config_schema",
              "command",
              "env",
              "args",
            ].includes(c.name)
          }
          tableName="mcp_servers"
          tables={dbsTables}
          showJoinedTables={false}
          // confirmUpdates={false}
        />
      )}
      <FlexRow>
        {/* <PopupMenu
          button={
            <Btn
              variant="filled"
              color="action"
              iconPath={mdiPlus}
              onClick={() => setShowAddServer(true)}
            >
              Add MCP Server
            </Btn>
          }
          title="Add MCP Server"
          onClickClose={false}
          clickCatchStyle={{ opacity: 1 }}
        ></PopupMenu> */}
        <Btn
          variant="filled"
          color="action"
          iconPath={mdiPlus}
          onClick={() => setShowAddServer(true)}
        >
          Add MCP Server
        </Btn>
        <Btn
          color="action"
          variant="faded"
          onClick={() => {
            dbs.global_settings.update(
              {},
              {
                mcp_servers_disabled:
                  !globalSettings.data?.mcp_servers_disabled,
              },
            );
          }}
        >
          {globalSettings.data?.mcp_servers_disabled ? "Enable" : "Disable"} all
          MCP Servers
        </Btn>

        <Select
          className="min-w-0 ml-auto"
          emptyLabel={"Search tools"}
          btnProps={{
            iconPath: selectedTool ? mdiFilter : mdiMagnify,
            color: selectedTool ? "action" : "default",
            variant: selectedTool ? "filled" : "faded",
            style: {
              flexShrink: 1,
            },
          }}
          value={selectedTool?.id}
          fullOptions={(tools ?? []).map((t) => ({
            key: t.id,
            label: `${t.server_name} ${t.name}`,
            subLabel: t.description,
          }))}
          onChange={(id) => {
            setSelectedTool(tools?.find((t) => t.id === id));
          }}
        />
      </FlexRow>
      {selectedTool && (
        <FlexRow className="jc-end">
          <Btn color="action" onClick={() => setSelectedTool(undefined)}>
            Clear filter
          </Btn>
        </FlexRow>
      )}
    </>
  );
};
