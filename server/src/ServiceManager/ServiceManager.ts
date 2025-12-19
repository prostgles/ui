import { type ProcessLog } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import type { DBS } from "..";
import { buildService } from "./buildService";
import { enableService } from "./enableService";
import { initialiseServices } from "./initialiseServices";
import { prostglesServices, ServiceInstance } from "./ServiceManagerTypes";
import { startService } from "./startService";
import { stopService } from "./stopService";

export class ServiceManager {
  dbs: DBS | undefined;
  constructor(dbs: DBS | undefined) {
    this.dbs = dbs;
    if (dbs) {
      void initialiseServices(this, dbs);
    }
  }
  onServiceLog = (
    serviceName: keyof typeof prostglesServices,
    logItems: ProcessLog[],
  ) => {
    const serviceStatus = this.activeServices.get(serviceName)?.status;
    const logs = logItems
      .slice(-100)
      .map((l) => l.text)
      .join("");
    void this.dbs?.services.update(
      { name: serviceName },
      { logs, status: serviceStatus ?? "stopped" },
    );
  };
  activeServices: Map<string, ServiceInstance> = new Map();

  getActiveService<Status extends ServiceInstance["status"]>(
    serviceName: keyof typeof prostglesServices,
    expectedStatus: Status,
  ) {
    const activeInstance = this.activeServices.get(serviceName);
    if (!activeInstance || activeInstance.status !== expectedStatus) {
      throw new Error(
        `Unexpected: service ${serviceName} is not in expected status ${expectedStatus}`,
      );
    }
    return activeInstance as Extract<ServiceInstance, { status: Status }>;
  }

  getService<
    ServiceName extends keyof typeof prostglesServices,
    ExistingServices extends typeof prostglesServices,
  >(
    serviceName: ServiceName,
  ): ServiceInstance<ExistingServices[ServiceName]> | undefined {
    const activeInstance = this.activeServices.get(serviceName);
    //@ts-ignore
    return activeInstance;
  }

  buildService = buildService.bind(this);

  startService = startService.bind(this);

  enableService = enableService.bind(this);

  stopService = stopService.bind(this);

  destroy = () => {
    this.activeServices.forEach((service) => {
      if (service.status === "running" || service.status === "starting") {
        service.stop();
      }
    });
    this.activeServices = new Map();
  };
}

let serviceManager: ServiceManager | undefined = undefined;
export const getServiceManager = (dbs: DBS | undefined) => {
  serviceManager ??= new ServiceManager(dbs);
  return serviceManager;
};
