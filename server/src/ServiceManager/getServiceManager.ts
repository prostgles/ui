import type { DBS } from "@src/index";
import { resolve } from "path";
import { ServiceManager } from "./ServiceManager";
import {
  prostglesServices,
  type ServiceRegistry,
} from "./ServiceManagerTypes";

let serviceManager: ServiceManager<typeof prostglesServices> | undefined;

export const initializeServiceManager = async (dbs: DBS) => {
  const isNew = !serviceManager;
  serviceManager ??= await ServiceManager.create(
    {
      services: prostglesServices,
      serviceRoot: resolve(
        __dirname,
        "../../../../src/ServiceManager/services",
      ),
    },
    dbs,
  );
  return { serviceManager, isNew };
};

export const getServiceManager = <
  AdditionalServices extends ServiceRegistry = Record<never, never>,
>() => {
  if (!serviceManager) {
    throw new Error(
      "ServiceManager is not available before Prostgles startup.",
    );
  }
  return serviceManager as ServiceManager<
    typeof prostglesServices & AdditionalServices
  >;
};
