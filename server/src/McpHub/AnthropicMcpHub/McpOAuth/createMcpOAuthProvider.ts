import type { DBSSchema } from "@common/publishUtils";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth";
import type { OAuthClientInformationMixed } from "@modelcontextprotocol/sdk/shared/auth";
import { getElectronConfig } from "@src/electronConfig";
import type { DBS } from "@src/index";
import {
  MCP_CLIENT_INFO,
  type RemoteMcpServerParameters,
  type StreamableHTTPOAuthState,
} from "../McpTypes";

export const createMcpOAuthProvider = ({
  dbs,
  serverConfig,
}: {
  dbs: DBS;
  serverConfig: DBSSchema["mcp_server_configs"];
}) => {
  const { server_name, oauth, config } = serverConfig;
  if (
    !oauth ||
    config.type !== "OAuth" ||
    oauth.phase === "connected_bearer" ||
    oauth.phase === "error" ||
    oauth.phase === "initializing_bearer_token"
  ) {
    return;
  }

  const auth = config.auth;
  if (auth.mode === "none" || auth.mode === "bearer") {
    return;
  }

  const configClientInfo =
    auth.mode === "authorization_code" || auth.mode === "client_credentials" ?
      auth
    : undefined;

  let state: StreamableHTTPOAuthState =
    oauth.phase === "initializing_dcr" ?
      {}
    : {
        discoveryState: oauth.discoveryState as unknown as OAuthDiscoveryState,
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
      };

  let currentAuthorizationUrl: string | undefined;
  const onPersist = async (authorizationUrl = currentAuthorizationUrl) => {
    if (authorizationUrl) currentAuthorizationUrl = authorizationUrl;

    const {
      clientInformation,
      discoveryState: _discoveryState,
      codeVerifier,
      tokens,
    } = state;
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
        server_name: server_name,
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

  const redirectUri = oauth.redirectUri;

  const clientSecret =
    configClientInfo?.clientSecret ??
    (oauth.phase === "connected" ? oauth.clientSecret : undefined);
  const commonConfig = {
    redirect_uris: [oauth.redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: clientSecret ? "client_secret_post" : "none",
  };

  const authProvider: OAuthClientProvider = {
    redirectUrl: redirectUri,
    clientMetadataUrl:
      auth.mode === "cimd" ? auth.clientMetadataUrl : undefined,
    clientMetadata: {
      client_name: MCP_CLIENT_INFO.name,
      ...commonConfig,
    },
    clientInformation() {
      if (configClientInfo?.mode === "client_credentials") {
        return {
          ...state.clientInformation,
          ...commonConfig,
          // response_types: ["token"],
          grant_types: ["client_credentials"],
          client_id: configClientInfo.clientId,
          client_secret: configClientInfo.clientSecret,
        };
      }
      return state.clientInformation;
    },
    async saveClientInformation(clientInformation) {
      state = { ...state, clientInformation };
      await onPersist();
    },
    tokens: async () => {
      if (auth.mode === "client_credentials" && !state.tokens) {
        const tokens = await fetchClientCredentialsToken(auth);
        state = { ...state, tokens };
        await onPersist();
      }
      return state.tokens;
    },
    async saveTokens(tokens) {
      state = { ...state, tokens };
      await onPersist();
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      await onPersist(authorizationUrl.toString());
      throw new Error(
        "OAuth authorization required. Open this URL: " +
          authorizationUrl.toString(),
      );
    },
    async saveCodeVerifier(codeVerifier: string) {
      state = { ...state, codeVerifier };
      await onPersist();
    },
    codeVerifier(): string {
      if (!state.codeVerifier) {
        throw new Error("OAuth code verifier missing");
      }
      return state.codeVerifier;
    },
    async saveDiscoveryState(discoveryState: OAuthDiscoveryState) {
      state = { ...state, discoveryState };
      await onPersist();
    },
    discoveryState() {
      return state.discoveryState;
    },
  };

  const onAuthError = (
    errorType: "dcr_not_supported" | "unknown",
    error: string,
  ) => {
    void dbs.mcp_server_configs.update(
      {
        server_name: server_name,
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
  };

  return {
    authProvider,
    onAuthError,
    pendingAuthorizationCode:
      oauth.phase === "exchanging_code" ?
        oauth.pendingAuthorizationCode
      : undefined,
    onCodeUsed: async () => {
      state = { ...state, pendingAuthorizationCode: undefined };
      await onPersist();
    },
  } satisfies RemoteMcpServerParameters["OAuth"];
};

const fetchClientCredentialsToken = async ({
  clientId,
  clientSecret,
  tokenEndpoint,
  scope,
}: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}) => {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) body.set("scope", scope);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `Client credentials token request failed: ${response.status} ${await response.text()}`,
    );
  }
  const tokens = (await response.json()) as Promise<
    StreamableHTTPOAuthState["tokens"]
  >;
  return tokens;
};
