import { useState } from "react";
import type { MCPServerConfigProps } from "../MCPServerConfigEditor";

export type McpServerOAuthConfigState = ReturnType<
  typeof useMcpServerOAuthConfigState
>;

export const useMcpServerOAuthConfigState = ({
  existingConfig,
}: Pick<MCPServerConfigProps, "existingConfig">) => {
  const [savePngIcon, setSavePngIcon] = useState(true);
  const oauth = existingConfig?.oauth;
  const savedConfig =
    existingConfig?.config.type === "OAuth" ? existingConfig.config : undefined;
  const savedScopes = savedConfig?.scopes;
  const [selectedScopes, setSelectedScopes] = useState(savedScopes ?? []);
  const [bearerToken, setBearerToken] = useState(
    savedConfig?.auth.mode === "bearer" ? savedConfig.auth.bearerToken : "",
  );
  const [clientMetadataUrl, setClientMetadataUrl] = useState(
    savedConfig?.auth.mode === "cimd" ? savedConfig.auth.clientMetadataUrl : "",
  );
  const authorizationUrl =
    oauth?.phase === "awaiting_authorization" ?
      oauth.authorizationUrl
    : undefined;
  const authModeFullOptions =
    oauth?.phase === "error" && oauth.errorType === "dcr_not_supported" ?
      MCP_OAUTH_MODES.map((m) =>
        m.key === "dcr" ? { ...m, disabledInfo: "DCR mode not supported" } : m,
      )
    : MCP_OAUTH_MODES;
  const [authMode, setAuthMode] = useState(savedConfig?.auth.mode ?? "dcr");

  return {
    savePngIcon,
    setSavePngIcon,
    selectedScopes,
    setSelectedScopes,
    bearerToken,
    setBearerToken,
    authorizationUrl,
    oauth,
    savedScopes,
    savedConfig,
    existingConfig,
    authModeFullOptions,
    setAuthMode,
    authMode,
    clientMetadataUrl,
    setClientMetadataUrl,
  };
};

const MCP_OAUTH_MODES = [
  {
    key: "none",
    label: "None",
    subLabel: "No OAuth authentication required",
  },
  {
    key: "dcr",
    label: "DCR",
    subLabel:
      "Dynamic Client Registration - Automatically registers an OAuth client with the authorization server",
  },
  {
    key: "bearer",
    label: "Bearer Token",
    subLabel: "Uses a pre-issued access token for authentication",
  },
  {
    key: "cimd",
    label: "CIMD",
    subLabel:
      "Client ID Metadata Documents - Uses a public client identifier document for OAuth client discovery",
  },
] as const;
