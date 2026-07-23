import type { DBSSchema } from "@common/publishUtils";
import { FlexCol } from "@components/Flex";
import React from "react";
import type { MCPServerConfigProps } from "../MCPServerConfigEditor";
import { McpServerOAuthConfigActions } from "./McpServerOAuthConfigActions";
import { McpServerOAuthConfigCredentials } from "./McpServerOAuthConfigCredentials";
import { McpServerOAuthConfigTopControls } from "./McpServerOAuthConfigTopControls";
import { useMcpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";

type P = {
  server: DBSSchema["mcp_servers"];
  setConfig: (newConfig: DBSSchema["mcp_server_configs"]["config"]) => void;
} & Pick<MCPServerConfigProps, "onDone" | "existingConfig">;

export const McpServerOAuthConfig = ({
  existingConfig,
  server,
  setConfig,
  onDone,
}: P) => {
  const state = useMcpServerOAuthConfigState({
    existingConfig,
  });

  return (
    <FlexCol>
      <McpServerOAuthConfigTopControls
        {...state}
        server={server}
        setConfig={setConfig}
      />
      <McpServerOAuthConfigCredentials {...state} />
      <McpServerOAuthConfigActions
        {...state}
        server={server}
        setConfig={setConfig}
      />
    </FlexCol>
  );
};
