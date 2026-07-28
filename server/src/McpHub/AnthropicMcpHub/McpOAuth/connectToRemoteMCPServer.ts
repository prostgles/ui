import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tout } from "@src/utils/tout";
import type { McpConnection } from "../McpHub";
import {
  type McpServerEvents,
  type RemoteMcpServerParameters,
} from "../McpTypes";
import { createMcpServerHandlers } from "../createMcpServerHandlers";
import { fromEntries } from "@common/utils";
import { OAUTH_AUTHORIZATION_URL_ERROR } from "./createMcpOAuthProvider";

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
        requestInit: parameters.isInitializing ? undefined : requestInit,
        authProvider: parameters.OAuth?.authProvider,
      },
    );

    let destroyed = false;
    transport.onerror = (error) => {
      const errMsg = "Transport error: " + error.message;
      appendToLog(errMsg);
      const isOAuthAuthorizationUrl = error.message.startsWith(
        OAUTH_AUTHORIZATION_URL_ERROR,
      );
      const dcrNotSupported =
        error.message ===
        "Incompatible auth server: does not support dynamic client registration";

      const isDisconnectedError =
        error.message ===
        "SSE stream disconnected: AbortError: This operation was aborted";
      if (destroyed && isDisconnectedError) {
        return;
      }
      void onLog(
        {
          type: "error",
          errorType:
            dcrNotSupported ? "oauth-dcr-not-supported"
            : isOAuthAuthorizationUrl ? "oauth-authorization-url"
            : isDisconnectedError ? "disconnected"
            : undefined,
          data: error,
        },
        getFullLog(),
      );
      if (isOAuthAuthorizationUrl || isDisconnectedError) {
        // do nothing
      } else {
        parameters.OAuth?.onAuthError(
          dcrNotSupported ? "dcr_not_supported" : "unknown",
          error.message,
        );
      }
    };
    transport.onclose = () => {
      onTransportClose();
    };

    const oauthCode = parameters.OAuth?.pendingAuthorizationCode;
    if (oauthCode) {
      await transport.finishAuth(oauthCode).catch(async (error) => {
        console.error(
          "Failed to finish OAuth authentication for " + name,
          error,
        );
        return Promise.reject(error);
      });
      await parameters.OAuth?.onCodeUsed();
    }

    await client.connect(transport).catch(async (error) => {
      await tout(500);
      await transport.close().catch(() => {});
      return Promise.reject(error);
    });

    if (parameters.RemoteServerEvents?.onConnected) {
      const serverVersion = client.getServerVersion();
      const capabilities = client.getServerCapabilities();
      await parameters.RemoteServerEvents.onConnected({
        capabilities,
        serverVersion,
      });
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
      handlers: createMcpServerHandlers(client),
      destroy: async () => {
        try {
          destroyed = true;
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
    return fromEntries(requestInit.headers as [string, string][]);
  }
  return Object.fromEntries(
    Object.entries(requestInit.headers).map(([key, value]) => [
      key,
      String(value),
    ]),
  );
};
