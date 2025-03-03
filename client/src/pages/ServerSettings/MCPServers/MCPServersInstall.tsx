import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import Btn from "../../../components/Btn";
import ErrorComponent from "../../../components/ErrorComponent";
import { FlexRow } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import { CodeEditor } from "../../../dashboard/CodeEditor/CodeEditor";
import type { ServerSettingsProps } from "../ServerSettings";

export const MCPServersInstall = ({
  name,
  dbs,
  dbsMethods,
}: Pick<ServerSettingsProps, "dbsMethods" | "dbs"> & { name: string }) => {
  const mcpServer = dbs.mcp_servers.useSubscribeOne({
    name,
  });
  const installLogs = dbs.mcp_server_logs.useSubscribeOne({
    server_name: name,
  });
  const installLogData = installLogs.data;
  const data = mcpServer.data;
  const mcpServerStatus = usePromise(async () => {
    data?.installed;
    return dbsMethods.getMCPServersStatus?.(name);
  }, [data?.installed, dbsMethods, name]);

  const { installMCPServer } = dbsMethods;
  if (!installMCPServer) return <>Not allowed</>;
  return (
    <FlexRow className="f-1 jc-end">
      {installLogData?.install_log && !data?.installed ?
        <PopupMenu
          title="MCP Server installation logs"
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          button={
            !installLogData.install_error ?
              <Btn
                loading={!installLogData.install_error}
                variant="faded"
                color="action"
                size="small"
              >
                Installing MCP Server...
              </Btn>
            : <Btn
                loading={!installLogData.install_error}
                color="danger"
                variant="faded"
                size="small"
              >
                Installation Error
              </Btn>
          }
        >
          <CodeEditor
            language="bash"
            style={{
              minWidth: "min(600px, 100vw)",
              minHeight: "300px",
            }}
            value={installLogData.install_log}
          />
          {installLogData.install_error && (
            <ErrorComponent
              className="mt-1"
              error={installLogData.install_error}
            />
          )}
        </PopupMenu>
      : <Btn
          variant="faded"
          color={"action"}
          size="small"
          onClickPromise={async () => {
            return installMCPServer(name);
          }}
        >
          {mcpServerStatus?.ok ? "Re-Install" : "Install"}
        </Btn>
      }
    </FlexRow>
  );
};
