import { isObject, type DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import React, { useCallback } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { MCPServerConfigProps } from "../MCPServerConfigEditor";
import { McpServerOAuthConfigAuthorizeUrlBtn } from "./McpServerOAuthConfigAuthorizeUrlBtn";
import type { McpServerOAuthConfigState } from "./useMcpServerOAuthConfigState";

type P = {
  server: DBSSchema["mcp_servers"];
  setConfig: (newConfig: DBSSchema["mcp_server_configs"]["config"]) => void;
} & Pick<MCPServerConfigProps, "existingConfig"> &
  McpServerOAuthConfigState;

export const McpServerOAuthConfigActions = ({
  server,
  setConfig,
  savePngIcon,
  selectedScopes,
  authorizationUrl,
  oauth,
  bearerToken,
  authMode,
  clientMetadataUrl,
  clientId,
  clientSecret,
  authInfo,
}: P) => {
  const {
    dbsMethods: { authenticateMcpServer },
    dbs,
  } = usePrglCore();

  const onAuthenticateMcpServer = useCallback(async () => {
    if (!authenticateMcpServer) {
      throw new Error("authenticateMcpServer is not available");
    }
    const newConfig = {
      type: "OAuth",
      scopes: selectedScopes,
      savePngIcon,
      auth:
        authMode === "bearer" ?
          {
            mode: authMode,
            bearerToken,
          }
        : authMode === "dcr" ?
          {
            mode: authMode,
          }
        : authMode === "authorization_code" ?
          {
            mode: authMode,
            clientId,
            clientSecret,
          }
        : authMode === "client_credentials" ?
          {
            mode: authMode,
            clientId,
            clientSecret,
            tokenEndpoint: (() => {
              const tokenEndpoint =
                isObject(authInfo) ?
                  authInfo.serverInfo.token_endpoint
                : undefined;
              if (!tokenEndpoint) {
                throw new Error(
                  "Cannot determine token endpoint for client_credentials mode",
                );
              }
              return tokenEndpoint;
            })(),
          }
        : authMode === "none" ?
          {
            mode: authMode,
          }
        : {
            mode: authMode,
            clientMetadataUrl,
          },
    } as const satisfies DBSSchema["mcp_server_configs"]["config"];
    await authenticateMcpServer({
      origin: window.location.origin,
      serverName: server.name,
      config: newConfig,
    });
    setConfig(newConfig);
  }, [
    authInfo,
    authMode,
    authenticateMcpServer,
    bearerToken,
    clientId,
    clientMetadataUrl,
    clientSecret,
    savePngIcon,
    selectedScopes,
    server.name,
    setConfig,
  ]);

  return (
    <>
      {(oauth?.phase === "error" || !oauth) && (
        <Btn
          onClickPromise={onAuthenticateMcpServer}
          variant="filled"
          color="action"
          label={LABEL_PROPS}
          data-command="McpServerOAuthConfigActions.LoginWithOAuth"
          disabledInfo={
            authorizationUrl ? "Must click 'Login with OAuth' first "
            : !bearerToken && authMode === "bearer" ?
              "Must provide a bearer token"
            : !clientMetadataUrl && authMode === "cimd" ?
              "Must provide a client metadata URL"
            : undefined
          }
        >
          {authMode === "bearer" ? "Connect" : "Login with OAuth"}
        </Btn>
      )}
      {authorizationUrl ?
        <McpServerOAuthConfigAuthorizeUrlBtn
          authorizationUrl={authorizationUrl}
        />
      : (
        oauth?.phase === "exchanging_code" ||
        oauth?.phase === "initializing_client"
      ) ?
        <Btn
          title="Waiting for server to finish authentication. Click to reset and try again."
          label={LABEL_PROPS}
          onClickPromise={onAuthenticateMcpServer}
          loading={"allow-clicking"}
          color="warn"
          variant="faded"
        >
          Waiting for server to finish authentication
        </Btn>
      : oauth?.phase === "connected" || oauth?.phase === "connected_bearer" ?
        <Btn
          label={LABEL_PROPS}
          color={server.enabled ? "green" : "action"}
          variant="filled"
          data-command="McpServerOAuthConfigActions.connectionToggle"
          title={
            server.enabled ?
              "Server is connected. Click to disconnect."
            : "Server is disconnected. Click to connect."
          }
          onClickPromise={async () => {
            await dbs.mcp_servers.update(
              { name: server.name },
              { enabled: !server.enabled },
            );
          }}
        >
          {server.enabled ? "Connected" : "Disconnected"}
        </Btn>
      : (
        oauth?.phase === "initializing_dcr" ||
        oauth?.phase === "initializing_bearer_token"
      ) ?
        <Btn label={LABEL_PROPS} loading={true} color="warn" variant="faded">
          Initializing OAuth configuration. Please wait...
        </Btn>
      : oauth?.phase === "error" ?
        <>
          <ErrorComponent error={oauth.error} />
        </>
      : !oauth ?
        null
      : <ErrorComponent error={"Unknown/Unexpected state: " + oauth.phase} />}
    </>
  );
};

export const LABEL_PROPS = {
  label: "OAuth phase",
  style: { marginBottom: ".5em" },
  variant: "normal",
} as const;
