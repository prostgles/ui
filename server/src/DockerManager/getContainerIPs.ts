import { execSync } from "child_process";
import { getKeys, isDefined } from "prostgles-types";
import { DOCKER_CONTAINER_NAME_PREFIX } from "./DockerManager";

const containerIpCache = {
  containerNames: "",
  ipToContainerName: [] as { ip: string; name: string }[],
};
export const getContainerIPs = (containers: Record<string, any>) => {
  const containerNames = getKeys(containers).sort().join();
  if (containerIpCache.containerNames === containerNames) {
    return containerIpCache.ipToContainerName;
  }
  const res = execSync(
    "docker inspect   -f '{{.Name}} {{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)",
  ).toString();
  const ipToContainerName = res
    .split("\n")
    .map((line) => {
      // Skip slash at the beginning of the container name
      const [name, ip] = line.slice(1).trim().split(" ");
      if (!name || !name.startsWith(DOCKER_CONTAINER_NAME_PREFIX) || !ip)
        return;
      return { name, ip };
    })
    .filter(isDefined);

  containerIpCache.containerNames = containerNames;
  containerIpCache.ipToContainerName = ipToContainerName;
  return ipToContainerName;
};
