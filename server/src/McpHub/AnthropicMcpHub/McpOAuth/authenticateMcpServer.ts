import type { DBSSchema } from "@common/publishUtils";
import { ROUTES } from "@common/utils";
import type { DBS } from "@src/index";

export const enqueuedRequestIds = new Set<string>();

export const authenticateMcpServer = async (
  {
    serverName,
    origin,
    config,
  }: {
    serverName: string;
    origin: string;
    config: Extract<
      DBSSchema["mcp_server_configs"]["config"],
      { type: "OAuth" }
    >;
  },
  dbs: DBS,
) => {
  if (config.scopes.join() !== [...config.scopes].sort().join()) {
    throw new Error(
      `Scopes must be sorted in ascending order. Provided scopes: ${config.scopes.join()}`,
    );
  }
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
  const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
  enqueuedRequestIds.add(request_id);
  setTimeout(() => {
    enqueuedRequestIds.delete(request_id);
  }, FIVE_MINUTES_IN_MS);
  callbackUrl.searchParams.set("scopes", JSON.stringify(config.scopes));
  callbackUrl.searchParams.set("server_name", serverName);
  callbackUrl.searchParams.set("request_id", request_id);
  const redirectUri = callbackUrl.toString();

  const auth = config.auth;
  await dbs.mcp_server_configs.upsert(
    {
      server_name: serverName,
      config,
    },
    {
      oauth_request_id: request_id,
      oauth:
        auth.mode === "bearer" ?
          {
            phase: "initializing_bearer_token",
            redirectUri,
            scopes: config.scopes,
            bearerToken: auth.bearerToken,
          }
        : auth.mode === "client_credentials" ?
          {
            phase: "initializing_client",
            redirectUri,
            scopes: config.scopes,
            clientInformation: {
              client_id: auth.clientId,
              client_secret: auth.clientSecret,
            },
            discoveryState: {},
            tokenEndpoint: auth.tokenEndpoint,
          }
        : {
            phase: "initializing_dcr",
            redirectUri,
            scopes: config.scopes,
          },
    },
    {
      returning: "*",
    },
  );
  await dbs.mcp_servers.update(
    {
      name: serverName,
    },
    {
      enabled: true,
    },
  );
};
