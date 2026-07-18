import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth";
import {
  MCP_CLIENT_INFO,
  type RemoteMcpServerParameters,
  type StreamableHTTPOAuthState,
} from "../McpTypes";
import { debounce } from "@src/ConnectionManager/ForkedPrglProcRunner/ForkedPrglProcRunner";

export const createMcpOAuthProvider = ({
  OAuthState,
  OAuthEvents,
  OAuthConfig,
}: RemoteMcpServerParameters): OAuthClientProvider => {
  let state: StreamableHTTPOAuthState = { ...(OAuthState ?? {}) };

  const persist = debounce(async () => {
    await OAuthEvents.onPersistState(state);
    await console.log("Persisting OAuth state:", state);
  }, 1000);

  const provider: OAuthClientProvider = {
    redirectUrl: OAuthConfig.redirectUri,
    clientMetadataUrl: OAuthConfig.clientMetadataUrl,
    clientMetadata: {
      client_name: MCP_CLIENT_INFO.name,
      redirect_uris: [OAuthConfig.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method:
        OAuthConfig.clientSecret ? "client_secret_post" : "none",
    },
    clientInformation() {
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
