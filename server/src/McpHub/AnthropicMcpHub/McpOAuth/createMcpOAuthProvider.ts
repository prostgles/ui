import type { DBSSchema } from "@common/publishUtils";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth";
import type { OAuthClientInformationMixed } from "@modelcontextprotocol/sdk/shared/auth";
import { getElectronConfig } from "@src/electronConfig";
import type { DBS } from "@src/index";
import { isObject } from "prostgles-types";
import { registerMcpAuthorizationRequest } from "./authenticateMcpServer";
import {
  MCP_CLIENT_INFO,
  type RemoteMcpServerParameters,
  type StreamableHTTPOAuthState,
} from "../McpTypes";

export const OAUTH_AUTHORIZATION_URL_ERROR =
  "OAuth authorization required. Open this URL: ";

export const createMcpOAuthProvider = ({
  dbs,
  serverConfig,
}: {
  dbs: DBS;
  serverConfig: DBSSchema["mcp_server_configs"];
}) => {
  const { id, oauth, config } = serverConfig;
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
      {
        clientInformation: configClientInfo && {
          client_id: configClientInfo.clientId,
          client_secret: configClientInfo.clientSecret,
        },
      }
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
  let authorizationRequestId: string | undefined;
  const onPersist = async (authorizationUrl = currentAuthorizationUrl) => {
    if (authorizationUrl) currentAuthorizationUrl = authorizationUrl;

    const {
      clientInformation,
      discoveryState: _discoveryState,
      codeVerifier,
      tokens,
    } = state;
    const discoveryState = _discoveryState as unknown as
      Record<string, unknown> | undefined;
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

    await dbs.mcp_server_configs.update(
      { id },
      {
        oauth: newState,
        ...(authorizationRequestId && {
          oauth_request_id: authorizationRequestId,
        }),
      },
    );

    if (oauth.phase === "exchanging_code" && newState.phase === "connected") {
      getElectronConfig()?.focusWindow();
    }
  };

  const redirectUri = oauth.redirectUri;
  const scope = oauth.scopes.join(" ");

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
    redirectUrl: auth.mode === "client_credentials" ? undefined : redirectUri,
    clientMetadataUrl:
      auth.mode === "cimd" ? auth.clientMetadataUrl : undefined,
    clientMetadata: {
      client_name: MCP_CLIENT_INFO.name,
      ...commonConfig,
      scope: scope || undefined,
    },
    state: () => {
      /* Keep the registered redirect URI stable and renew state for each authorization attempt. */
      authorizationRequestId = registerMcpAuthorizationRequest();
      return authorizationRequestId;
    },
    ...(auth.mode === "client_credentials" && {
      prepareTokenRequest: () =>
        new URLSearchParams({
          grant_type: "client_credentials",
          ...(scope && { scope }),
        }),
    }),
    clientInformation() {
      if (configClientInfo?.mode === "client_credentials") {
        return {
          ...state.clientInformation,
          ...commonConfig,
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
        const tokens = await fetchClientCredentialsToken({
          ...auth,
          scope,
        });
        state = { ...state, tokens };
        await onPersist();
      }
      return state.tokens;
    },
    async saveTokens(tokens) {
      currentAuthorizationUrl = undefined;
      state = { ...state, tokens };
      await onPersist();
    },
    invalidateCredentials: (scope) => {
      if (scope === "all" || scope === "tokens") {
        state.tokens = undefined;
      }
      if (scope === "all" || scope === "client") {
        state.clientInformation = configClientInfo && {
          client_id: configClientInfo.clientId,
          client_secret: configClientInfo.clientSecret,
        };
      }
      if (scope === "all" || scope === "verifier") {
        state.codeVerifier = undefined;
      }
      if (scope === "all" || scope === "discovery") {
        state.discoveryState = undefined;
      }
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      await onPersist(authorizationUrl.toString());
      throw new Error(
        OAUTH_AUTHORIZATION_URL_ERROR + authorizationUrl.toString(),
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

  const onAuthError = async (
    errorType: "dcr_not_supported" | "unknown",
    error: string,
  ) => {
    await dbs.mcp_server_configs.update(
      { id },
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

export const isMcpOAuthAuthorizationRequired = (error: unknown) =>
  isObject(error) &&
  typeof error.message === "string" &&
  error.message.startsWith(OAUTH_AUTHORIZATION_URL_ERROR);

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
