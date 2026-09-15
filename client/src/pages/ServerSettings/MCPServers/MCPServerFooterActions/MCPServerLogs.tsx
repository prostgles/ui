import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import React from "react";
import { CodeEditor } from "../../../../dashboard/CodeEditor/CodeEditor";
import type { MCPServerWithToolAndConfigs } from "../useMCPServersListProps";

export const MCPServerLogs = ({
  mcpServer,
}: {
  mcpServer: MCPServerWithToolAndConfigs;
}) => {
  const logItem = mcpServer.mcp_server_logs.at(-1);

  return (
    logItem &&
    Boolean(logItem.log || logItem.install_log || logItem.install_error) && (
      <PopupMenu
        title={`MCP Server ${JSON.stringify(mcpServer.name)} stderr logs`}
        positioning="center"
        // className="mr-auto ml-p25"
        data-command="MCPServerFooterActions.logs"
        showFullscreenToggle={{}}
        button={
          <Btn
            color={logItem.error ? "danger" : "default"}
            // variant="faded"
            size="small"
          >
            {logItem.error ? "Error" : "Logs"}
          </Btn>
        }
        onClickClose={false}
        clickCatchStyle={{ opacity: 1 }}
      >
        <CodeEditor
          language={"bash"}
          value={logItem.log}
          style={{
            minWidth: "min(900px, 100vw)",
            minHeight: "min(900px, 100vh)",
          }}
        />
      </PopupMenu>
    )
  );
};
