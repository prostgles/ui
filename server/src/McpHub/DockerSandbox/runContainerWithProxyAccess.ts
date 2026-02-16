import { DOCKER_USER_AGENT } from "@common/OAuthUtils";
import { upsertSession } from "@src/authConfig/upsertSession";
import { getElectronConfig } from "@src/electronConfig";
import type { DBS } from "@src/index";
import { createContainer } from "./createContainer";
import {
  dockerContainerAuthRegistry,
  type ContainerProxyContext,
} from "./dockerMCPServerProxy/dockerContainerAuthRegistry";
import { getOrCreateDockerMCPServerProxy } from "./dockerMCPServerProxy/dockerMCPServerProxy";
import type { ProcessLog } from "./executeDockerCommand";

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
  const proxy = await getOrCreateDockerMCPServerProxy(
    getElectronConfig()?.isElectron,
  );
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

  const containerResult =
    await dockerContainerAuthRegistry.runContainerWithAuth(
      {
        dbPermissions,
        sid_token,
        requestHandlers,
      },
      (containerName) => {
        if (args.networkMode === "host") {
          throw new Error(
            "Bridge network mode is required to use the Docker MCP proxy. Host network mode is not supported.",
          );
        }
        const argsWithEnv: typeof args = {
          ...args,
          environment: {
            ...args.environment,
            [DOCKER_MCP_ENDPOINT_ENV_VAR]: proxy.baseUrl,
          },
        };
        return createContainer(containerName, argsWithEnv, onLogs);
      },
    );
  return containerResult;
};
