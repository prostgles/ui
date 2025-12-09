import { executeDockerCommand } from "@src/DockerManager/executeDockerCommand";
import type { ServiceManager } from "./ServiceManager";
import type {
  OnServiceLogs,
  prostglesServices,
  ServiceInstance,
} from "./ServiceManagerTypes";
import { join } from "path";
import { existsSync } from "fs";
import { getRootDir } from "@src/electronConfig";

export async function buildService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: OnServiceLogs,
) {
  const onLogsCombined: OnServiceLogs = (logs) => {
    onLogs(logs);
    this.onServiceLog(serviceName, logs);
  };
  const existingService = this.activeServices.get(serviceName);
  if (existingService) {
    if (existingService.status === "building") {
      return existingService.building;
    }
    if (existingService.status === "running") {
      return;
    }
    this.activeServices.delete(serviceName);
  }

  const abortController = new AbortController();
  const stop = () => {
    abortController.abort();
  };
  const serviceCwd = join(
    getRootDir(),
    "/src/ServiceManager/services",
    serviceName,
    "src",
  );
  if (!existsSync(join(serviceCwd, "Dockerfile"))) {
    throw new Error(`Service Dockerfile not found in: ${serviceCwd}`);
  }
  const instance: ServiceInstance = {
    status: "building",
    building: executeDockerCommand(
      [
        "build",
        "-t",
        camelCaseToSkewerCase(serviceName),
        "--label",
        "prostgles",
        ".",
      ],
      {
        timeout: 600_000,
        signal: abortController.signal,
        cwd: serviceCwd,
      },
      onLogsCombined,
    )
      .then((result) => {
        this.getActiveService(serviceName, "building");
        this.activeServices.set(serviceName, { status: "building-done" });
        return result;
      })
      .catch((err) => {
        console.error(`Error building service ${serviceName}:`, err);
        this.getActiveService(serviceName, "building");
        this.activeServices.set(serviceName, {
          status: "error",
          error: err,
        });
        return Promise.reject(err);
      }),
    stop,
  };
  this.activeServices.set(serviceName, instance);
  return instance.building;
}

export const camelCaseToSkewerCase = (str: string) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};
