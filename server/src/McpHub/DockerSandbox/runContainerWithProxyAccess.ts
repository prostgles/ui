import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import { upsertSession } from "@src/authConfig/upsertSession";
import type { DBS } from "@src/index";
import { createContainer } from "./createContainer";
import {
  dockerContainerAuthRegistry,
  type ContainerProxyContext,
} from "./dockerMCPServerProxy/dockerContainerAuthRegistry";
import { getOrCreateDockerMCPServerProxy } from "./dockerMCPServerProxy/dockerMCPServerProxy";
import type { ProcessLog } from "./executeDockerCommand";
import { randomBytes } from "crypto";

export const DOCKER_MCP_ENDPOINT_ENV_VAR = "DOCKER_MCP_ENDPOINT";
export const runContainerWithProxyAccess = async (
  dbs: DBS,
  {
    user_id,
    dbPermissions,
    requestHandlers,
  }: {
    user_id: string;
  } & Pick<ContainerProxyContext, "requestHandlers" | "dbPermissions">,
  args: Parameters<typeof createContainer>[1],
  onLogs?: (logs: ProcessLog[]) => void,
) => {
  const proxy = await getOrCreateDockerMCPServerProxy();
  const user = await dbs.users.findOne({ id: user_id });
  if (!user) {
    throw new Error(`User with id ${user_id} not found`);
  }
  const database_config = await dbs.database_configs.findOne({
    $existsJoined: { connections: { is_state_db: true } },
  });
  if (!database_config) {
    throw new Error("No database_config found for state db connection");
  }
  const tokenForMCP = await upsertSession({
    db: dbs,
    ip: "127.0.0.1",
    user,
    user_agent: DOCKER_USER_AGENT,
    database_config,
  });
  const sid_token = tokenForMCP.sid;
  if (!sid_token) {
    throw new Error("Failed to create session for Docker MCP");
  }

  const npmVars = {
    /** Speed things up */
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
    NPM_CONFIG_FETCH_RETRIES: "0",
    NPM_CONFIG_FETCH_TIMEOUT: "15000",
    NO_UPDATE_NOTIFIER: "1",
    FORCE_COLOR: "1",
  };

  const secret = randomBytes(32).toString("base64url");
  const containerResult =
    await dockerContainerAuthRegistry.runContainerWithAuth(
      {
        dbPermissions,
        sid_token,
        requestHandlers,
        secret,
      },
      (containerName) => {
        const argsWithEnv: typeof args = {
          ...args,
          environment: {
            ...npmVars,
            ...args.environment,
            [DOCKER_MCP_ENDPOINT_ENV_VAR]:
              proxy.getBaseUrl(args.networkMode ?? "bridge") +
              "/mcp-proxy/" +
              secret,
          },
          buildEnvironment: npmVars,
        };
        return createContainer(containerName, argsWithEnv, onLogs);
      },
    );
  return containerResult;
};
