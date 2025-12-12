import { execSync } from "child_process";
import { getKeys, isDefined, pickKeys } from "prostgles-types";
import type { DBSSchema } from "@common/publishUtils";
import type { GetAuthContext } from "./dockerMCPServerProxy";
export const DOCKER_CONTAINER_NAME_PREFIX = "prostgles-docker-mcp-sandbox";

export type CreateContainerContext = {
  userId: string;
  chatId: number;
};

export type ContainerAuthInfo = {
  chat: DBSSchema["llm_chats"];
  sid_token: string;
};

const containers: Record<string, ContainerAuthInfo> = {};

const setContainerInfo = (name: string, info: ContainerAuthInfo) => {
  containers[name] = info;
};

const deleteContainerInfo = (name: string) => {
  delete containers[name];
};

const containerIpCache = {
  containerNames: "",
  ipToContainerName: new Map<string, string>(),
};
const getIPToContainerName = () => {
  const containerNames = getKeys(containers).sort().join();
  if (!containerNames) {
    throw new Error("No containers available");
  }
  if (containerIpCache.containerNames === containerNames) {
    return containerIpCache.ipToContainerName;
  }
  const containerNamesToIPs = execSync(
    "docker inspect   -f '{{.Name}} {{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)",
  )
    .toString()
    .split("\n")
    .map((line) => {
      // Skip slash at the beginning of the container name
      const [name, ip] = line.slice(1).trim().split(" ");
      if (!name || !name.startsWith(DOCKER_CONTAINER_NAME_PREFIX) || !ip)
        return;
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

const getContainerFromIP: GetAuthContext = (ip: string) => {
  const containerName = getIPToContainerName().get(ip);

  if (!containerName) throw new Error(`No container found for IP ${ip}`);
  const containerInfo = containerName ? containers[containerName] : undefined;
  if (!containerName || !containerInfo) {
    return;
  }
  return pickKeys(containerInfo, ["chat", "sid_token"]);
};

export const dockerContainerAuthRegistry = {
  getContainerFromIP,
  setContainerInfo,
  deleteContainerInfo,
};
