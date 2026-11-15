import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpConnection } from "../McpHub";
import {
  type McpServerEvents,
  type RemoteMcpServerParameters,
} from "../McpTypes";
import { createMcpServerHandlers } from "../createMcpServerHandlers";
import { fromEntries } from "@common/utils";
import { isMcpOAuthAuthorizationRequired } from "./createMcpOAuthProvider";
import {
  OAuthError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

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
    /* Ignore previous errors. */
  });

  const inPromise = (async () => {
    const requestInit = {
      ...(parameters.requestInit ?? {}),
      headers: {
        ...getHeadersFromRequestInit(parameters.requestInit),
        ...(parameters.headers ?? {}),
      },
    } as RequestInit;

    let destroyed = false;
    let sessionExpired = false;
    let reconnecting: Promise<void> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let transport: StreamableHTTPClientTransport;

    const logError = async (error: unknown) => {
      if (destroyed || isMcpOAuthAuthorizationRequired(error)) return;
      await onLog({ type: "error", data: error }, getFullLog());
    };

    const connect = async () => {
      transport = new StreamableHTTPClientTransport(new URL(parameters.url), {
        requestInit: parameters.isInitializing ? undefined : requestInit,
        authProvider: parameters.OAuth?.authProvider,
      });
      const currentTransport = transport;
      transport.onerror = (error) => {
        if (
          destroyed ||
          transport !== currentTransport ||
          isMcpOAuthAuthorizationRequired(error)
        )
          return;
        appendToLog("Transport error: " + error.message);
        if (isExpiredSessionError(error) && transport.sessionId) {
          sessionExpired = true;
          if (!reconnectTimer && !reconnecting) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = undefined;
              void reconnect().catch(logError).catch(console.error);
            }, 0);
          }
          return;
        }
        if (sessionExpired && error.message.startsWith("Failed to reconnect"))
          return;
        void logError(error).catch(console.error);
        const dcrNotSupported =
          error.message ===
          "Incompatible auth server: does not support dynamic client registration";
        if (
          dcrNotSupported ||
          (error instanceof OAuthError && !(error instanceof ServerError))
        ) {
          void parameters.OAuth?.onAuthError(
            dcrNotSupported ? "dcr_not_supported" : "unknown",
            error.message,
          ).catch(console.error);
        } else if (
          error instanceof UnauthorizedError ||
          (error instanceof StreamableHTTPError &&
            (error.code === 401 || error.code === 403))
        ) {
          void parameters.RemoteServerEvents?.onAuthenticationError?.(
            error.message,
          ).catch(console.error);
        }
      };
      transport.onclose = onTransportClose;
      await client.connect(transport);
      sessionExpired = false;
    };

    const reconnect = () => {
      if (reconnecting) return reconnecting;
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      reconnecting = (async () => {
        await client.close();
        if (destroyed) throw new Error(`MCP server ${name} was disconnected`);
        await connect();
      })().finally(() => {
        reconnecting = undefined;
      });
      return reconnecting;
    };

    const runRequest = async <T>(request: () => Promise<T>): Promise<T> => {
      if (reconnecting) await reconnecting;
      else if (sessionExpired) await reconnect();
      try {
        return await request();
      } catch (error) {
        /* Only a rejected session is safe to retry; other failures may have executed the tool. */
        if (!isExpiredSessionError(error) || !sessionExpired || destroyed)
          throw error;
        await reconnect();
        return request();
      }
    };

    try {
      const oauthCode = parameters.OAuth?.pendingAuthorizationCode;
      if (oauthCode) {
        const authTransport = new StreamableHTTPClientTransport(
          new URL(parameters.url),
          { authProvider: parameters.OAuth?.authProvider, requestInit },
        );
        try {
          await authTransport.finishAuth(oauthCode);
          await parameters.OAuth?.onCodeUsed();
        } finally {
          await authTransport.close();
        }
      }
      await connect();
      await parameters.RemoteServerEvents?.onConnected?.({
        serverVersion: client.getServerVersion(),
        capabilities: client.getServerCapabilities(),
      });
    } catch (error) {
      destroyed = true;
      clearTimeout(reconnectTimer);
      await client.close().catch(console.error);
      throw error;
    }

    const connection: McpConnection = {
      server_name,
      server: {
        name,
        config: parameters,
        status: "connected",
      },
      client,
      get transport() {
        return transport;
      },
      handlers: createMcpServerHandlers(client, runRequest),
      destroy: async () => {
        try {
          destroyed = true;
          clearTimeout(reconnectTimer);
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

const isExpiredSessionError = (error: unknown) =>
  error instanceof StreamableHTTPError && error.code === 404;
