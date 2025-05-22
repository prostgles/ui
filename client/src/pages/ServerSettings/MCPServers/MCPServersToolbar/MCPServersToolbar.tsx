import { mdiFilter, mdiMagnify } from "@mdi/js";
import React from "react";
import type { DBSSchema } from "../../../../../../commonTypes/publishUtils";
import Btn from "../../../../components/Btn";
import { FlexRow } from "../../../../components/Flex";
import Select from "../../../../components/Select/Select";
import { AddMCPServer } from "./AddMCPServer";
import type { MCPServersProps } from "../MCPServers";

export const MCPServersToolbar = ({
  dbs,
  selectedTool,
  setSelectedTool,
}: MCPServersProps & {
  selectedTool: undefined | DBSSchema["mcp_server_tools"];
  setSelectedTool: (tool: undefined | DBSSchema["mcp_server_tools"]) => void;
}) => {
  const { data: tools } = dbs.mcp_server_tools.useFind();
  const globalSettings = dbs.global_settings.useSubscribeOne();

  return (
    <>
      <FlexRow>
        <AddMCPServer dbs={dbs} />
        <Btn
          color="action"
          variant="faded"
          data-command="MCPServersToolbar.disableAllToggle"
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
          {globalSettings.data?.mcp_servers_disabled ?
            "Enable all MCP Servers"
          : "Disable all MCP Servers"}
        </Btn>

        <Select
          className="min-w-0 ml-auto"
          emptyLabel={"Search tools"}
          data-command="MCPServersToolbar.searchTools"
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
