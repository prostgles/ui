import type { ProcessLog } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import type { prostglesServices } from "./ServiceManagerTypes";
import type { ServiceManager } from "./ServiceManager";

export async function enableService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: (logs: ProcessLog[]) => void,
) {
  await this.enablingServices.get(serviceName);
  const activeService = this.activeServices.get(serviceName);
  if (activeService?.status === "running") {
    return activeService;
  } else {
    this.stopService(serviceName);
  }
  const enabling = async () => {
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

    const startedServer = await this.startService(serviceName, onLogs);
    return startedServer;
  };
  const result = enabling().finally(() => {
    this.enablingServices.delete(serviceName);
  });
  this.enablingServices.set(serviceName, result);
  return result;
}
