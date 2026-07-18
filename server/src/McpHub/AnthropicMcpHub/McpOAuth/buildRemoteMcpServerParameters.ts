import type { DBSSchema } from "@common/publishUtils";
import type {
  McpServerParameters,
  StreamableHTTPOAuthState,
} from "../McpTypes";
import type { DBS } from "@src/index";

export const buildRemoteMcpServerParameters = ({
  dbs,
  server,
  mcp_server_config,
  onLog,
}: {
  dbs: DBS;
  server: DBSSchema["mcp_servers"];
  mcp_server_config: DBSSchema["mcp_server_configs"];
  onLog: McpServerParameters["onLog"];
}) => {
  const { oauth, config } = mcp_server_config;
  if (!oauth) {
    throw new Error(
      `MCP server "${server.name}" has command "streamable-http" but no OAuth config in mcp_server_configs.`,
    );
  }

  if (oauth.phase === "waiting-for-auth") {
    // do not enable
    return;
  }

  let currentAuthState: StreamableHTTPOAuthState | undefined;
  let currentAuthorizationUrl: string | undefined;
  const onPersist = async (
    authorizationUrl = currentAuthorizationUrl,
    state = currentAuthState,
  ) => {
    currentAuthorizationUrl ??= authorizationUrl;
    currentAuthState = state;

    await dbs.mcp_server_configs.upsert(
      {
        server_name: server.name,
        config,
      },
      {
        oauth:
          currentAuthorizationUrl ?
            {
              phase: "waiting-for-auth",
              redirectUri: oauth.redirectUri,
              scopes: oauth.scopes,
              authorizationUrl: currentAuthorizationUrl,
              state: currentAuthState,
            }
          : {
              phase: "connected",
              redirectUri: oauth.redirectUri,
              scopes: oauth.scopes,
              state: currentAuthState,
            },
      },
    );
  };

  return {
    type: "remote",
    server_name: server.name,
    url: server.url!, // TODO: change the parameters to typed jsonb,
    OAuthEvents: {
      onAuthRedirect: async (authorizationUrl) => {
        console.log(
          `MUST BE Redirecting to authorization URL for server "${server.name}": ${authorizationUrl}`,
        );
        await onPersist(authorizationUrl);
      },
      onPersistState: async (state) => {
        await onPersist(undefined, state);
      },
    },
    OAuthConfig: {
      redirectUri: oauth.redirectUri,
      clientSecret:
        oauth.phase === "connected" ? oauth.clientSecret : undefined,
      scopes: oauth.scopes,
      clientMetadataUrl: config.clientMetadataUrl as string | undefined,
    },
    OAuthState: {
      ...("state" in oauth ? (oauth.state as {}) : {}),
      pendingAuthorizationCode:
        oauth.phase === "code-provided" ?
          oauth.pendingAuthorizationCode
        : undefined,
    },
    RemoteServerEvents: {
      onConnected: async (info) => {
        await console.error(info);
        await dbs.mcp_servers.update(
          {
            name: server.name,
          },
          {
            info:
              info?.serverVersion?.description ?? info?.serverVersion?.title,
            capabilities: info?.capabilities,
            server_version: info?.serverVersion,
          },
        );
      },
    },
    onLog,
  } satisfies McpServerParameters;
};
