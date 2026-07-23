import type { DBS } from "@src/index";
import type {
  RemoteMcpServerParameters,
  StreamableHTTPOAuthState,
} from "../McpTypes";
import type { DBSSchema } from "@common/publishUtils";
import { getElectronConfig } from "@src/electronConfig";
import type { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth";
import type { OAuthClientInformationMixed } from "@modelcontextprotocol/sdk/shared/auth";

export const getRemoteMcpOauthConfigParameters = (
  dbs: DBS,
  { config, oauth }: NonNullable<DBSSchema["mcp_server_configs"]>,
  server: DBSSchema["mcp_servers"],
): Pick<
  RemoteMcpServerParameters,
  "OAuthConfig" | "OAuthEvents" | "OAuthState"
> => {
  if (
    config.type !== "OAuth" ||
    !oauth ||
    oauth.phase === "connected_bearer" ||
    oauth.phase === "error" ||
    oauth.phase === "initializing_bearer_token"
  ) {
    return {
      OAuthConfig: {
        redirectUri: "",
        clientMetadataUrl: undefined,
        scopes: [],
        clientSecret: undefined,
      },
      OAuthEvents: undefined,
      OAuthState: undefined,
    };
  }

  let lastState: StreamableHTTPOAuthState | undefined;
  let currentAuthorizationUrl: string | undefined;
  const onPersist = async (
    authorizationUrl = currentAuthorizationUrl,
    state = lastState,
  ) => {
    if (authorizationUrl) currentAuthorizationUrl = authorizationUrl;
    if (state) lastState = state;

    const {
      clientInformation,
      discoveryState: _discoveryState,
      codeVerifier,
      tokens,
    } = lastState ?? {};
    const discoveryState = _discoveryState as unknown as
      | Record<string, unknown>
      | undefined;
    if (!clientInformation || !discoveryState) return;

    const newState: DBSSchema["mcp_server_configs"]["oauth"] | undefined =
      currentAuthorizationUrl && codeVerifier ?
        {
          phase: "awaiting_authorization",
          scopes: oauth.scopes,
          discoveryState,
          clientInformation,
          redirectUri: oauth.redirectUri,
          authorizationUrl: currentAuthorizationUrl,
          codeVerifier,
        }
      : tokens ?
        {
          phase: "connected",
          scopes: oauth.scopes,
          discoveryState,
          clientInformation,
          redirectUri: oauth.redirectUri,
          tokens,
        }
      : undefined;
    if (!newState) return;

    await dbs.mcp_server_configs.upsert(
      {
        server_name: server.name,
        config,
      },
      {
        oauth: newState,
      },
    );

    if (oauth.phase === "exchanging_code" && newState.phase === "connected") {
      getElectronConfig()?.focusWindow();
    }
  };

  return {
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
      onAuthError: (errorType, error) => {
        void dbs.mcp_server_configs.update(
          {
            server_name: server.name,
            config,
          },
          {
            oauth: {
              phase: "error",
              scopes: oauth.scopes,
              redirectUri: oauth.redirectUri,
              errorType,
              error,
            },
          },
        );
      },
    },
    OAuthConfig: {
      redirectUri: oauth.redirectUri,
      scopes: oauth.scopes,
      clientMetadataUrl:
        config.auth.mode === "cimd" ? config.auth.clientMetadataUrl : undefined,
      clientSecret:
        oauth.phase === "connected" ? oauth.clientSecret : undefined,
    },
    OAuthState:
      oauth.phase === "initializing_dcr" ?
        undefined
      : {
          discoveryState:
            oauth.discoveryState as unknown as OAuthDiscoveryState,
          clientInformation:
            oauth.clientInformation as OAuthClientInformationMixed,
          codeVerifier:
            oauth.phase === "exchanging_code" ? oauth.codeVerifier : undefined,
          tokens:
            oauth.phase === "connected" ?
              (oauth.tokens as StreamableHTTPOAuthState["tokens"])
            : undefined,
          pendingAuthorizationCode:
            oauth.phase === "exchanging_code" ?
              oauth.pendingAuthorizationCode
            : undefined,
        },
  };
};
