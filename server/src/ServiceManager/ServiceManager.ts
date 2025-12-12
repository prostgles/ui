//@ts-nocheck

import type { DBSSchemaForInsert } from "@common/publishUtils";
import {
  executeDockerCommand,
  type ProcessLog,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/DockerManager/executeDockerCommand";
import type { DBS } from "..";
import { buildService } from "./buildService";
import {
  prostglesServices,
  ServiceInstance,
  type ProstglesService,
} from "./ServiceManagerTypes";
import { getContainerName, startService } from "./startService";

export class ServiceManager {
  dbs: DBS | undefined;
  constructor(dbs: DBS | undefined) {
    this.dbs = dbs;
    void dbs?.services
      .insert(
        Object.entries(
          prostglesServices as Record<string, ProstglesService>,
        ).map(
          ([name, service]) =>
            ({
              name,
              label: service.label,
              icon: service.icon,
              default_port: service.hostPort ?? service.port,
              description: service.description,
              configs: service.configs,
              status: "stopped",
            }) satisfies DBSSchemaForInsert["services"],
        ),
        {
          onConflict: "DoNothing",
        },
      )
      .then(() => {
        void dbs.services.find({ status: "running" }).then((services) => {
          const activeServiceNames: string[] = [];
          services.forEach((service) => {
            activeServiceNames.push(service.name);
            console.log("Re-enabling service on startup:", service.name);
            this.enableService(
              service.name as keyof typeof prostglesServices,
              () => {},
            ).catch(console.error);
          });
          this.activeServices.forEach((_, serviceName) => {
            if (!activeServiceNames.includes(serviceName)) {
              console.log(
                "Removing inactive service from activeServices:",
                serviceName,
              );
              this.activeServices.delete(serviceName);
            }
          });
        });
      });
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

  enableService = async (
    serviceName: keyof typeof prostglesServices,
    onLogs: (logs: ProcessLog[]) => void,
  ) => {
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
  };

  stopService = async (serviceName: keyof typeof prostglesServices) => {
    try {
      const service = this.getService(serviceName);
      if ("stop" in service) {
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
  };

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
