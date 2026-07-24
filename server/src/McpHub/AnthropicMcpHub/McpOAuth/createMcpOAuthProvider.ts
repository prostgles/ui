import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth";
import {
  MCP_CLIENT_INFO,
  type RemoteMcpServerParameters,
  type StreamableHTTPOAuthState,
} from "../McpTypes";

export const createMcpOAuthProvider = ({
  OAuthState,
  OAuthEvents,
  OAuthConfig,
}: RemoteMcpServerParameters): undefined | OAuthClientProvider => {
  let state: StreamableHTTPOAuthState = { ...(OAuthState ?? {}) };

  if (!OAuthConfig || !OAuthEvents) {
    return;
  }
  const persist = async () => {
    await OAuthEvents.onPersistState(state);
  };

  const commonConfig = {
    redirect_uris: [OAuthConfig.redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method:
      OAuthConfig.clientSecret ? "client_secret_post" : "none",
  };

  const provider: OAuthClientProvider = {
    redirectUrl: OAuthConfig.redirectUri,
    clientMetadataUrl: OAuthConfig.clientMetadataUrl,
    clientMetadata: {
      client_name: MCP_CLIENT_INFO.name,
      ...commonConfig,
    },
    clientInformation() {
      if (OAuthConfig.authMode === "client_credentials") {
        return {
          ...state.clientInformation,
          ...commonConfig,
          response_types: ["token"],
          client_id: OAuthConfig.clientId!,
          client_secret: OAuthConfig.clientSecret!,
        };
      }
      return state.clientInformation;
    },
    async saveClientInformation(clientInformation) {
      state = { ...state, clientInformation };
      await persist();
    },
    tokens() {
      return state.tokens;
    },
    async saveTokens(tokens) {
      state = { ...state, tokens };
      await persist();
    },
    async redirectToAuthorization(authorizationUrl: URL) {
      await OAuthEvents.onAuthRedirect(authorizationUrl.toString());
      throw new Error(
        "OAuth authorization required. Open this URL: " +
          authorizationUrl.toString(),
      );
    },
    async saveCodeVerifier(codeVerifier: string) {
      state = { ...state, codeVerifier };
      await persist();
    },
    codeVerifier(): string {
      if (!state.codeVerifier) {
        throw new Error("OAuth code verifier missing");
      }
      return state.codeVerifier;
    },
    async saveDiscoveryState(discoveryState: OAuthDiscoveryState) {
      state = { ...state, discoveryState };
      await persist();
    },
    discoveryState() {
      return state.discoveryState;
    },
  };

  return provider;
};
