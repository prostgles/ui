import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { Select } from "@components/Select/Select";
import { mdiFilter, mdiMagnify, mdiPlay, mdiStop } from "@mdi/js";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { MCPServersProps } from "../MCPServers";
import { useMcpToolsSelectOptions } from "../MCPServerTools/useMcpToolsSelectOptions";
import { AddMCPServer } from "./AddMCPServer";

export const MCPServersToolbar = ({
  selectedServer,
  setSelectedServer,
}: MCPServersProps & {
  selectedServer: undefined | string;
  setSelectedServer: (tool: undefined | string) => void;
}) => {
  const { dbs } = usePrglCore();
  const globalSettings = dbs.global_settings.useSubscribeOne();
  const { options, tools } = useMcpToolsSelectOptions();

  return (
    <>
      <FlexRow>
        <AddMCPServer dbs={dbs} />
        <Btn
          color="action"
          variant="outline"
          data-command="MCPServersToolbar.stopAllToggle"
          title={
            globalSettings.data?.mcp_servers_disabled ?
              "Start all MCP Servers"
            : "Stop all MCP Servers"
          }
          iconPath={
            globalSettings.data?.mcp_servers_disabled ? mdiPlay : mdiStop
          }
          onClickPromise={async () => {
            await dbs.global_settings.update(
              {},
              {
                mcp_servers_disabled:
                  !globalSettings.data?.mcp_servers_disabled,
              },
            );
          }}
        />

        <Select
          className="min-w-0 ml-auto"
          emptyLabel={"Search tools"}
          data-command="MCPServersToolbar.searchTools"
          btnProps={{
            iconPath: selectedServer ? mdiFilter : mdiMagnify,
            color: selectedServer ? "action" : "default",
            variant: selectedServer ? "filled" : "faded",
            style: {
              flexShrink: 1,
            },
          }}
          value={undefined}
          fullOptions={options}
          onChange={(id) => {
            setSelectedServer(tools?.find((t) => t.id === id)?.server_name);
          }}
        />
      </FlexRow>
      {selectedServer && (
        <FlexRow className="jc-end">
          <Btn color="action" onClick={() => setSelectedServer(undefined)}>
            Clear filter
          </Btn>
        </FlexRow>
      )}
    </>
  );
};
