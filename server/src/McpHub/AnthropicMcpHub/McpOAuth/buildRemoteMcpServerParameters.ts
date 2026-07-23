import type { DBSSchema } from "@common/publishUtils";
import type { DBS } from "@src/index";
import type { McpServerParameters } from "../McpTypes";
import { getRemoteMcpOauthConfigParameters } from "./getRemoteMcpOauthConfigParameters";
import { saveServerInfo } from "./saveServerInfo";

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

  if (config.type !== "OAuth") {
    throw new Error(
      `MCP server "${server.name}" has command "streamable-http" but mcp_server_configs has config type "${config.type}", expected "OAuth".`,
    );
  }

  if (oauth.phase === "awaiting_authorization" || oauth.phase === "error") {
    // do not enable
    return;
  }

  const remoteMcpOauthConfig = getRemoteMcpOauthConfigParameters(
    dbs,
    mcp_server_config,
    server,
  );

  const withBearerToken = (
    existingHeaders: Record<string, string> | undefined | null,
  ) => {
    if (config.auth.mode !== "bearer") {
      return existingHeaders ?? undefined;
    }
    return {
      ...existingHeaders,
      Authorization: `Bearer ${config.auth.bearerToken}`,
    };
  };

  return {
    type: "remote",
    isInitializing: oauth.phase === "initializing_dcr",
    server_name: server.name,
    url: server.url!, // TODO: change the parameters to typed jsonb,
    ...remoteMcpOauthConfig,
    headers: withBearerToken(server.headers),
    RemoteServerEvents: {
      onConnected: async (args) => {
        await saveServerInfo({ ...config, dbs, server }, args);
        if (
          config.auth.mode === "bearer" &&
          oauth.phase === "initializing_bearer_token"
        ) {
          await dbs.mcp_server_configs.update(
            {
              server_name: server.name,
              config,
            },
            {
              oauth: {
                phase: "connected_bearer",
                bearerToken: config.auth.bearerToken,
              },
            },
          );
        }
      },
    },
    onLog,
  } satisfies McpServerParameters;
};
