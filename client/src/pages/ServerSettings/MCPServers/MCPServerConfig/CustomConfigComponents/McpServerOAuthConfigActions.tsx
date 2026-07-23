import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import React from "react";
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
}: P) => {
  const {
    dbsMethods: { authenticateMcpServer },
    dbs,
  } = usePrglCore();

  if (!authenticateMcpServer) {
    return <ErrorComponent error={"authenticateMcpServer is not available"} />;
  }

  return (
    <>
      {(oauth?.phase === "error" || !oauth) && (
        <Btn
          onClickPromise={async () => {
            const newConfig = {
              type: "OAuth",
              scopes: selectedScopes,
              savePngIcon,
              auth:
                authMode === "bearer" ?
                  {
                    mode: "bearer",
                    bearerToken,
                  }
                : authMode === "dcr" ?
                  {
                    mode: "dcr",
                  }
                : authMode === "none" ?
                  {
                    mode: "none",
                  }
                : {
                    mode: "cimd",
                    clientMetadataUrl,
                  },
            } as const satisfies DBSSchema["mcp_server_configs"]["config"];
            await authenticateMcpServer({
              origin: window.location.origin,
              serverName: server.name,
              config: newConfig,
            });
            setConfig(newConfig);
          }}
          variant="filled"
          color="action"
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
      : oauth?.phase === "exchanging_code" ?
        <Btn loading={true} color="warn" variant="faded">
          Waiting for server to finish authentication
        </Btn>
      : oauth?.phase === "connected" || oauth?.phase === "connected_bearer" ?
        <Btn
          label={{
            label: "Status",
            style: { marginBottom: ".5em" },
            variant: "normal",
          }}
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
        <Btn loading={true} color="warn" variant="faded">
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
