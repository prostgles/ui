import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tout } from "@src/utils/tout";
import type { McpConnection } from "./McpHub";
import { createMcpOAuthProvider } from "./McpOAuth/createMcpOAuthProvider";
import {
  type McpServerEvents,
  type RemoteMcpServerParameters,
} from "./McpTypes";
import { fetchRemoteMcpServerInfo } from "./fetchRemoteMcpServerInfo";

const chainMap = new Map<string, Promise<any>>();

export const connectToRemoteMCPServer = async ({
  name,
  server_name,
  client,
  parameters,
  onLog,
  onTransportClose,
  appendToLog,
  getFullLog,
}: {
  name: string;
  server_name: string;
  client: McpConnection["client"];
  parameters: RemoteMcpServerParameters;
  appendToLog: (chunk: string) => void;
  getFullLog: () => string;
} & McpServerEvents) => {
  await chainMap.get(name)?.catch(() => {
    // ignore previous errors
  });

  const inPromise = (async () => {
    // if (!parameters.OAuthState?.pendingAuthorizationCode) {
    //   return;
    // }

    const authProvider = createMcpOAuthProvider(parameters);

    const requestInit = {
      ...(parameters.requestInit ?? {}),
      headers: {
        ...getHeadersFromRequestInit(parameters.requestInit),
        ...(parameters.headers ?? {}),
      },
    } as RequestInit;

    const transport = new StreamableHTTPClientTransport(
      new URL(parameters.url),
      {
        requestInit,
        authProvider,
      },
    );

    transport.onerror = (error) => {
      const errMsg = "Transport error: " + error.message;
      appendToLog(errMsg);
      void onLog("error", errMsg, getFullLog());
    };
    transport.onclose = () => {
      onTransportClose();
    };

    const oauthCode = parameters.OAuthState?.pendingAuthorizationCode;
    if (oauthCode) {
      await transport.finishAuth(oauthCode).catch(async (error) => {
        console.error(
          "Failed to finish OAuth authentication for " + name,
          error,
          parameters.OAuthState,
        );
        return Promise.reject(error);
      });
      await parameters.OAuthEvents.onPersistState({
        ...(parameters.OAuthState ?? {}),
        pendingAuthorizationCode: undefined,
      });
    }

    await client.connect(transport).catch(async (error) => {
      await tout(500);
      await transport.close().catch(() => {});
      return Promise.reject(error);
    });

    if (parameters.RemoteServerEvents?.onConnected) {
      const remoteInfo = await fetchRemoteMcpServerInfo(client);
      if (remoteInfo) {
        await parameters.RemoteServerEvents.onConnected(remoteInfo);
      }
    }

    const connection: McpConnection = {
      server_name,
      server: {
        name,
        config: parameters,
        status: "connected",
      },
      client,
      transport,
      destroy: async () => {
        try {
          await transport.close().catch((err) => {
            console.error(
              "Failed to close streamable transport for " + name,
              err,
            );
          });
          await client.close().catch((err) => {
            console.error("Failed to close MCP client for " + name, err);
          });
        } catch (error) {
          console.error(
            "Failed to close streamable transport for " + name,
            error,
          );
        }
      },
    };

    return connection;
  })();

  chainMap.set(name, inPromise);

  return inPromise;
};

const getHeadersFromRequestInit = (
  requestInit: RequestInit | undefined,
): Record<string, string> => {
  if (!requestInit?.headers) return {};
  if (requestInit.headers instanceof Headers) {
    return Object.fromEntries(requestInit.headers.entries());
  }
  if (Array.isArray(requestInit.headers)) {
    return Object.fromEntries(requestInit.headers);
  }
  return Object.fromEntries(
    Object.entries(requestInit.headers).map(([key, value]) => [
      key,
      String(value),
    ]),
  );
};
