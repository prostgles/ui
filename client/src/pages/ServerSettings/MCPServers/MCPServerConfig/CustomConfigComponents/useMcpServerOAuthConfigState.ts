import { useState } from "react";
import type { MCPServerConfigProps } from "../MCPServerConfigEditor";
import { usePromise } from "prostgles-client";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { DBSSchema } from "@common/publishUtils";

export type McpServerOAuthConfigState = ReturnType<
  typeof useMcpServerOAuthConfigState
>;

export const useMcpServerOAuthConfigState = ({
  existingConfig,
  server,
}: Pick<MCPServerConfigProps, "existingConfig"> & {
  server: DBSSchema["mcp_servers"];
}) => {
  const {
    dbsMethods: { getMcpOAuthMetadata },
  } = usePrglCore();
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
  const [clientId, setClientId] = useState(
    (
      savedConfig?.auth.mode === "client_credentials" ||
        savedConfig?.auth.mode === "authorization_code"
    ) ?
      savedConfig.auth.clientId
    : "",
  );
  const [clientSecret, setClientSecret] = useState(
    (
      savedConfig?.auth.mode === "client_credentials" ||
        savedConfig?.auth.mode === "authorization_code"
    ) ?
      savedConfig.auth.clientSecret
    : "",
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

  const [error, setError] = useState<unknown>();
  const authInfo = usePromise(async () => {
    if (server.url) {
      if (!getMcpOAuthMetadata) {
        return "not-allowed";
      }
      return getMcpOAuthMetadata({ serverName: server.name }).catch(setError);
    }
    return "none";
  }, [getMcpOAuthMetadata, server.name, server.url]);

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
    clientId,
    setClientId,
    clientSecret,
    setClientSecret,
    authInfo,
    authInfoError: error,
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
    key: "authorization_code",
    label: "Authorization Code",
    subLabel:
      "Uses the OAuth authorization code flow to obtain an access token for authentication",
  },
  {
    key: "client_credentials",
    label: "Client Credentials",
    subLabel:
      "Uses the OAuth client credentials flow to obtain an access token for authentication",
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
