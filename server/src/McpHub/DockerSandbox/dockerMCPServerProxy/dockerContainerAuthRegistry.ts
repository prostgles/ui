import type { DBSSchema } from "@common/publishUtils";
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { isDefined, pickKeys } from "prostgles-types";
export const DOCKER_CONTAINER_NAME_PREFIX = "prostgles-docker-mcp-sandbox";

export type DbPermissions = {
  db_data_permissions: DBSSchema["llm_chats"]["db_data_permissions"];
  connection_id: string;
};

export type McpProxyRequestContext = Omit<
  ContainerProxyContext,
  "requestHandlers"
>;
export type DockerMCPServerProxyHandler = (
  authContext: McpProxyRequestContext,
  ...args: Parameters<RequestHandler>
) => void;

export type ContainerProxyContext = {
  dbPermissions: DbPermissions | undefined;
  sid_token: string;
  requestHandlers?: Record<
    string,
    {
      method: "POST" | "GET";
      handler: DockerMCPServerProxyHandler;
    }
  >;
};

const containers = new Map<string, ContainerProxyContext>();

const runContainerWithAuth = <T>(
  info: ContainerProxyContext,
  runContainer: (name: string) => Promise<T>,
): Promise<T> => {
  const name = `${DOCKER_CONTAINER_NAME_PREFIX}-${Date.now()}-${randomUUID()}`;
  if (containers.has(name)) {
    throw new Error(`Container with name ${name} already exists`);
  }
  containers.set(name, info);

  return runContainer(name).finally(() => {
    containers.delete(name);
  });
};

const containerIpCache = {
  containerNames: "",
  ipToContainerName: new Map<string, string>(),
};
const getIPToContainerName = () => {
  const containerNames = Array.from(containers.keys()).sort().join();
  if (!containerNames) {
    throw new Error("No containers available");
  }
  if (containerIpCache.containerNames === containerNames) {
    return containerIpCache.ipToContainerName;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const containerInspect: ContainerInspect[] = JSON.parse(
    execSync("docker inspect $(docker ps -aq)").toString(),
  );
  const containerNamesToIPs = containerInspect
    .map((c) => {
      const name = c.Name.slice(1);
      if (!name.startsWith(DOCKER_CONTAINER_NAME_PREFIX)) return;
      const ip =
        Object.values(c.NetworkSettings.Networks)[0]?.IPAddress || undefined;
      if (!ip) return;
      return { name, ip };
    })
    .filter(isDefined);

  const containerNamesWithIPs = containerNamesToIPs
    .map((c) => c.name)
    .sort()
    .join();
  containerIpCache.containerNames = containerNamesWithIPs;
  containerIpCache.ipToContainerName = new Map(
    containerNamesToIPs.map((c) => [c.ip, c.name]),
  );
  return containerIpCache.ipToContainerName;
};

const getContainerFromIP = (ip: string): ContainerProxyContext | undefined => {
  const containerName = getIPToContainerName().get(ip);

  if (!containerName) return;
  const containerInfo = containers.get(containerName);
  return (
    containerInfo &&
    pickKeys(containerInfo, ["dbPermissions", "sid_token", "requestHandlers"])
  );
};

export const dockerContainerAuthRegistry = {
  getContainerFromIP,
  runContainerWithAuth,
};

type ContainerInspect = {
  Id: string;
  Name: string;
  NetworkSettings: {
    Networks: Record<
      string,
      {
        IPAddress: string;
      }
    >;
  };
};
