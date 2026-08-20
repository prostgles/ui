import { type ProcessLog } from "@src/McpHub/DockerSandbox/executeDockerCommand";
import type { DBS } from "..";
import { buildService } from "./buildService";
import { enableService } from "./enableService";
import { initialiseServices } from "./initialiseServices";
import {
  prostglesServices,
  ServiceInstance,
  type ProstglesService,
  type RunningServiceInstance,
  type ServiceRegistry,
} from "./ServiceManagerTypes";
import { startService } from "./startService";
import { stopService } from "./stopService";
import { isTesting } from "@src/init/utils";
import { withRetries } from "./withRetries";
import type { ExtractBy } from "@common/utils";

export type StringKeyof<T> = Extract<keyof T, string>;

export type ServiceManagerConfig<Services extends ServiceRegistry> = {
  services: Services;
  serviceRoot: string;
};

export class ServiceManager<
  Services extends ServiceRegistry = Record<string, ProstglesService>,
> {
  readonly services: Services;
  private readonly serviceRoots = new Map<string, string>();
  dbs: DBS | undefined;

  private constructor(
    _config: ServiceManagerConfig<Services>,
    dbs: DBS | undefined,
  ) {
    this.services = {} as Services;
    this.dbs = dbs;
  }

  static async create<Services extends ServiceRegistry>(
    config: ServiceManagerConfig<Services>,
    dbs: DBS | undefined,
  ) {
    const instance = new ServiceManager(config, dbs);
    await instance.registerServices(config, true);
    return instance;
  }

  private async registerServices(
    { services, serviceRoot }: ServiceManagerConfig<ServiceRegistry>,
    allowBuiltInServices = false,
  ) {
    const clashingServices = Object.keys(services).filter(
      (serviceName) =>
        Object.hasOwn(this.services, serviceName) ||
        (!allowBuiltInServices &&
          Object.hasOwn(prostglesServices, serviceName)),
    );
    if (clashingServices.length) {
      throw new Error(
        `ServiceManager: Clashing service names detected: ${clashingServices.join(
          ", ",
        )}. Please rename your services to avoid conflicts with registered or built-in services.`,
      );
    }

    Object.assign(this.services, services);
    Object.keys(services).forEach((serviceName) => {
      this.serviceRoots.set(serviceName, serviceRoot);
    });
    if (this.dbs) {
      await initialiseServices(this, this.dbs);
    }
  }

  addServices = async <AdditionalServices extends ServiceRegistry>({
    services,
    serviceRoot,
  }: ServiceManagerConfig<AdditionalServices>) => {
    await this.registerServices({
      services,
      serviceRoot,
    });
    return this as unknown as ServiceManager<Services & AdditionalServices>;
  };

  getServiceRoot = (serviceName: string) => {
    const serviceRoot = this.serviceRoots.get(serviceName);
    if (serviceRoot === undefined) {
      throw new Error(`Service ${serviceName} has no registered root`);
    }
    return serviceRoot;
  };

  serviceLogUpdateQueue: Map<string, Promise<void>> = new Map();
  onServiceLog = (
    serviceName: StringKeyof<Services>,
    logItems: ProcessLog[],
  ) => {
    const prevQueue =
      this.serviceLogUpdateQueue.get(serviceName) ?? Promise.resolve();
    const nextQueue = prevQueue
      .catch((err) => {
        console.error(
          `Error in previous log update for service ${serviceName}:`,
          err,
        );
      })
      .then(async () => {
        const serviceStatus = this.activeServices.get(serviceName)?.status;
        const logs = logItems
          .slice(-100)
          .map((l) => l.text)
          .join("");

        if (!this.dbs) {
          console.warn("No dbs provided. Will not store service logs", {
            serviceName,
            serviceStatus,
          });
          return;
        }
        if (isTesting) {
          console.log(
            `Updating ${JSON.stringify(serviceName)} status to ${serviceStatus}`,
          );
        }
        const res = await this.dbs.services.update(
          { name: serviceName },
          { logs, status: serviceStatus ?? "stopped" },
          {
            returning: { name: 1, status: 1 },
          },
        );
        if (isTesting) {
          console.log("Updated service logs in db", res);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to update service logs in db for service " + serviceName,
          error,
        );
      });

    this.serviceLogUpdateQueue.set(serviceName, nextQueue);
  };
  activeServices: Map<string, ServiceInstance> = new Map();
  enablingServices: Map<string, Promise<RunningServiceInstance>> = new Map();

  getActiveService<Status extends ServiceInstance["status"]>(
    serviceName: StringKeyof<Services>,
    expectedStatus: Status,
  ) {
    const activeInstance = this.activeServices.get(serviceName);
    if (!activeInstance || activeInstance.status !== expectedStatus) {
      throw new Error(
        `Unexpected: service ${serviceName} is not in expected status ${expectedStatus}. Actual status: ${activeInstance?.status}`,
      );
    }
    return activeInstance as Extract<ServiceInstance, { status: Status }>;
  }

  getService<
    ServiceName extends StringKeyof<Services>,
    ExistingServices extends Services,
  >(
    serviceName: ServiceName,
  ): ServiceInstance<ExistingServices[ServiceName]> | undefined {
    const activeInstance = this.activeServices.get(serviceName);

    //@ts-ignore
    return activeInstance;
  }

  async getServiceWithRetries<
    ServiceName extends StringKeyof<Services>,
    ExistingServices extends Services,
  >(
    serviceName: ServiceName,
    onLogs?: (logs: ProcessLog[]) => void,
  ): Promise<
    ExtractBy<
      ServiceInstance<ExistingServices[ServiceName]>,
      "status",
      "running"
    >
  > {
    let serviceInstance = this.getService(serviceName);
    if (serviceInstance?.status === "running") {
      return serviceInstance;
    }
    await withRetries(() => {
      return this.enableService(serviceName, onLogs ?? (() => {}));
    }).catch((error) => {
      console.error(error);
      throw new Error(
        `Failed to start ${serviceName} service. Check server logs for details.`,
      );
    });

    serviceInstance = this.getService(serviceName);
    if (serviceInstance?.status !== "running") {
      throw new Error(`Failed to start ${serviceName} service.`);
    }
    return serviceInstance;
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
