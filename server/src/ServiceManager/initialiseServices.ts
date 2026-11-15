import type { DBSSchemaForInsert } from "@common/publishUtils";

import type { DBS } from "..";
import type { ServiceManager } from "./ServiceManager";

export const initialiseServices = async (
  serviceManager: ServiceManager,
  dbs: DBS,
) => {
  await dbs.services
    .insertMany(
      Object.entries(serviceManager.services).map(
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
          if (!Object.hasOwn(serviceManager.services, service.name)) return;
          activeServiceNames.push(service.name);
          console.log("Re-enabling service on startup: ", service.name);
          serviceManager
            .enableService(service.name, () => {})
            .catch(console.error);
        });
        serviceManager.activeServices.forEach((_, serviceName) => {
          if (!activeServiceNames.includes(serviceName)) {
            console.log(
              "Removing inactive service from activeServices:",
              serviceName,
            );
            serviceManager.activeServices.delete(serviceName);
          }
        });
      });
    });
};
