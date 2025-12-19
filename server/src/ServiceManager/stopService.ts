import { executeDockerCommand } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import type { ServiceManager } from "./ServiceManager";
import type { prostglesServices } from "./ServiceManagerTypes";
import { getContainerName } from "./startService";

export async function stopService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
) {
  try {
    const service = this.getService(serviceName);
    if (service && "stop" in service) {
      service.stop();
    }
  } catch {}
  const containerName = getContainerName(serviceName);
  await executeDockerCommand(["stop", containerName], {
    timeout: 10000,
  }).catch(() => {});
  await executeDockerCommand(["rm", "-f", containerName], { timeout: 10000 });
  this.activeServices.delete(serviceName);
  this.onServiceLog(serviceName, []);
}
