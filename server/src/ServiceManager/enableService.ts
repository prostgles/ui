import type { ProcessLog } from "@src/McpHub/DockerSandbox/executeDockerCommand";
import type { ServiceManager, StringKeyof } from "./ServiceManager";
import type {
  RunningServiceInstance,
  ServiceRegistry,
} from "./ServiceManagerTypes";

export async function enableService<
  Services extends ServiceRegistry,
  ServiceName extends StringKeyof<Services>,
>(
  this: ServiceManager<Services>,
  serviceName: ServiceName,
  onLogs: (logs: ProcessLog[]) => void,
): Promise<RunningServiceInstance<Services[ServiceName]>> {
  await this.enablingServices.get(serviceName);
  const activeService = this.activeServices.get(serviceName);
  if (activeService?.status === "running") {
    return activeService as RunningServiceInstance<Services[ServiceName]>;
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
  return result as Promise<RunningServiceInstance<Services[ServiceName]>>;
}
