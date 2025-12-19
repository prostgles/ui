import type { ProcessLog } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import type { prostglesServices } from "./ServiceManagerTypes";
import type { ServiceManager } from "./ServiceManager";

export async function enableService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: (logs: ProcessLog[]) => void,
) {
  await this.stopService(serviceName);
  const buildResult = await this.buildService(serviceName, onLogs);
  if (buildResult !== "close") {
    throw new Error(
      `Service ${serviceName} build failed with state: ${buildResult}`,
    );
  }

  const buildServiceInstance = this.activeServices.get(serviceName);
  if (buildServiceInstance?.status === "building-done") {
    await this.dbs?.services.update(
      { name: serviceName },
      { build_hash: buildServiceInstance.buildHash },
    );
  }

  return this.startService(serviceName, onLogs);
}
