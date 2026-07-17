import { ROUTES } from "@common/utils";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { DBS } from "@src/index";
import { MCP_CLIENT_INFO } from "../McpTypes";
import { createMcpOAuthProvider } from "./createMcpOAuthProvider";

export const authenticateMcpServer = async (
  {
    serverName,
    origin,
    scopes: scopesUnsorted,
  }: { serverName: string; origin: string; scopes: string[] },
  dbs: DBS,
) => {
  const scopes = [...scopesUnsorted].sort();
  const server = await dbs.mcp_servers.findOne({ name: serverName });
  if (!server) {
    throw new Error(`MCP server "${serverName}" not found`);
  }
  const { command, url } = server;
  if (command !== "streamable-http") {
    throw new Error(
      `MCP server "${serverName}" has command "${command}", expected "streamable-http"`,
    );
  }
  if (!url) {
    throw new Error(`MCP server "${serverName}" has no URL`);
  }
  const callbackUrl = new URL(ROUTES.MCP_OAUTH_CALLBACK, origin);
  const request_id = crypto.randomUUID();
  callbackUrl.searchParams.set("scopes", JSON.stringify(scopes));
  callbackUrl.searchParams.set("server_name", serverName);
  return new Promise<{ authorizationUrl: string }>((resolve, reject) => {
    try {
      const redirectUri = callbackUrl.toString();
      let currentAuthorizationUrl: string | undefined;
      let currentAuthState: unknown;
      const onSuccess = async (
        authorizationUrl = currentAuthorizationUrl,
        state = currentAuthState,
      ) => {
        currentAuthorizationUrl ??= authorizationUrl;
        currentAuthState ??= state;

        if (!currentAuthorizationUrl || !currentAuthState) {
          return;
        }

        await dbs.mcp_server_configs.upsert(
          {
            server_name: serverName,
            oauth_request_id: request_id,
            config: {
              scopes,
            },
          },
          {
            oauth: {
              phase: "waiting-for-auth",
              redirectUri,
              scopes,
              authorizationUrl: currentAuthorizationUrl,
              state: currentAuthState,
            },
          },
        );
        resolve({ authorizationUrl: currentAuthorizationUrl });
      };
      const authProvider = createMcpOAuthProvider({
        OAuthState: undefined,
        url,
        OAuthEvents: {
          onAuthRedirect: async (authorizationUrl) => {
            await onSuccess(authorizationUrl);
          },
          onPersistState: async (state) => {
            console.log("onPersistState called with state:", state);
            await onSuccess(undefined, state);
          },
        },
        OAuthConfig: {
          redirectUri,
        },
      });
      const transport = new StreamableHTTPClientTransport(new URL(url), {
        authProvider,
      });
      const client = new Client(MCP_CLIENT_INFO);

      client
        .connect(transport)
        .then(() => {
          console.log("Connected to MCP server:", serverName);
        })
        .catch((err) => {
          if (currentAuthorizationUrl) {
            return;
          }
          console.error("Error connecting to MCP server:", err);
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
};
