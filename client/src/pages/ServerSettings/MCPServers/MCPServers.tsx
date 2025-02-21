import React from "react";
import { FlexCol, FlexRow, FlexRowWrap } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import Btn from "../../../components/Btn";
import SmartForm from "../../../dashboard/SmartForm/SmartForm";
import SmartCardList from "../../../dashboard/SmartCard/SmartCardList";
import { InfoRow } from "../../../components/InfoRow";
import type { ServerSettingsProps } from "../ServerSettings";
import { usePromise } from "prostgles-client/dist/react-hooks";
import { CodeConfirmation } from "../../../dashboard/Backup/CodeConfirmation";
import { mdiDelete } from "@mdi/js";
import { MCPServersInstall } from "./MCPServersInstall";
import { SwitchToggle } from "../../../components/SwitchToggle";
import Chip from "../../../components/Chip";

export const MCPServers = ({
  theme,
  dbsMethods,
  dbs,
  dbsTables,
}: ServerSettingsProps) => {
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

        <MCPServersInstall dbs={dbs} dbsMethods={dbsMethods} />
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
            name: "enabled",
            hide: true,
          },
        ]}
        getRowFooter={(r) => (
          <FlexRow className="jc-end">
            <SwitchToggle
              title={"Enabled"}
              checked={r.enabled}
              onChange={(enabled) =>
                dbs.mcp_servers.update({ name: r.name }, { enabled })
              }
            />
          </FlexRow>
        )}
      />
    </FlexCol>
  );
};
