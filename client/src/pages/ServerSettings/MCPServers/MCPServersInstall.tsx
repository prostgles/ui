import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useEffect } from "react";
import Btn from "../../../components/Btn";
import { InfoRow } from "../../../components/InfoRow";
import { CodeConfirmation } from "../../../dashboard/Backup/CodeConfirmation";
import type { ServerSettingsProps } from "../ServerSettings";
import PopupMenu from "../../../components/PopupMenu";
import { CodeEditor } from "../../../dashboard/CodeEditor/CodeEditor";
import Popup from "../../../components/Popup/Popup";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../../components/Flex";

export const MCPServersInstall = ({
  dbs,
  dbsMethods,
}: Pick<ServerSettingsProps, "dbsMethods" | "dbs">) => {
  const installLogs = dbs.mcp_install_logs.useSubscribeOne({
    id: "mcp_install",
  });
  const data = installLogs.data;
  const mcpServerStatus = usePromise(async () => {
    installLogs.data?.finished;
    return dbsMethods.getMCPServersStatus?.();
  }, [installLogs.data?.finished, dbsMethods]);

  const [error, setError] = React.useState<any>();
  const Logs =
    !data ? null : (
      <CodeEditor
        language="bash"
        style={{
          minWidth: "min(600px, 100vw)",
          minHeight: "300px",
        }}
        value={data.log}
      />
    );
  return (
    <FlexRow className="f-1 jc-end">
      {error && (
        <Popup
          positioning="center"
          onClose={() => setError(undefined)}
          clickCatchStyle={{ opacity: 1 }}
          title="Error"
        >
          <FlexCol>
            {Logs}
            <ErrorComponent error={error} />
          </FlexCol>
        </Popup>
      )}
      {data?.error && (
        <Btn
          color="danger"
          variant="faded"
          onClick={() => setError(data.error)}
        >
          Error
        </Btn>
      )}
      {data?.log && !data.finished ?
        <PopupMenu
          title="MCP Server installation logs"
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          button={
            <Btn loading={true} variant="faded" color="action">
              Installing MCP Servers...
            </Btn>
          }
        >
          {Logs}
        </PopupMenu>
      : mcpServerStatus?.ok ?
        <CodeConfirmation
          className="ml-auto"
          positioning="center"
          button={
            <Btn variant="faded" color="action" title="Will need to confirm">
              Re-Install MCP Servers
            </Btn>
          }
          message={
            <InfoRow style={{ alignItems: "center" }} color="danger">
              Will uninstall MCP Servers. This action is not reversible!
            </InfoRow>
          }
          confirmButton={(popupClose) => (
            <>
              <Btn
                variant="faded"
                color={"action"}
                onClickPromise={async () => {
                  await dbsMethods.installMCPServers?.(true).catch(setError);
                  popupClose();
                }}
              >
                Re-Install servers
              </Btn>
            </>
          )}
        />
      : <Btn
          variant="faded"
          color={"action"}
          onClickPromise={async () => {
            return dbsMethods.installMCPServers?.().catch(setError);
          }}
        >
          Install servers
        </Btn>
      }
    </FlexRow>
  );
};
