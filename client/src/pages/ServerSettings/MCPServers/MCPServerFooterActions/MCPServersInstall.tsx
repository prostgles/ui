import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { CodeEditor } from "../../../../dashboard/CodeEditor/CodeEditor";
import type { ServerSettingsProps } from "../../ServerSettings";
import type { MCPServerWithToolAndConfigs } from "../useMCPServersListProps";

export const MCPServersInstall = ({
  mcpServer,
  dbs,
  dbsMethods,
}: Pick<ServerSettingsProps, "dbsMethods" | "dbs"> & {
  mcpServer: MCPServerWithToolAndConfigs;
}) => {
  if (!mcpServer.source) {
    throw new Error("MCP Server source is not defined");
  }
  const { name } = mcpServer;
  const installLogs = dbs.mcp_server_logs.useSubscribeOne({
    server_name: name,
  });

  const installLogData = installLogs.data;
  const { install_log, install_error } = installLogData ?? {};
  const log = (install_log || "") + (install_error || "");
  const mcpServerStatus = usePromise(async () => {
    mcpServer.installed; // To ensure it refreshes when installed changes
    return dbsMethods.getMCPServersStatus?.(name);
  }, [mcpServer.installed, dbsMethods, name]);

  const { installMCPServer } = dbsMethods;
  if (!installMCPServer) return <>Not allowed</>;
  return (
    <FlexRow className="f-1 jc-end">
      {!!installLogData && (
        <PopupMenu
          title="MCP Server installation logs"
          positioning="center"
          clickCatchStyle={{ opacity: 1 }}
          button={
            <Btn
              color={installLogData.install_error ? "danger" : undefined}
              variant="faded"
              size="small"
            >
              Installation Logs
            </Btn>
          }
        >
          <CodeEditor
            language="bash"
            style={{
              minWidth: "min(600px, 100vw)",
              minHeight: "300px",
            }}
            value={log}
          />
          {installLogData.install_error && (
            <ErrorComponent
              className="mt-1"
              error={installLogData.install_error}
            />
          )}
        </PopupMenu>
      )}
      <Btn
        variant="faded"
        color={"action"}
        size="small"
        onClickPromise={async () => {
          return installMCPServer(name);
        }}
        data-command="MCPServersInstall.install"
      >
        {mcpServerStatus?.ok ? "Re-Install" : "Install"}
      </Btn>
    </FlexRow>
  );
};
