import {
  executeDockerCommand,
  type ExecutionResult,
} from "@src/DockerManager/executeDockerCommand";
import { getRootDir } from "@src/electronConfig";
import { join } from "path";
import { getDockerBuildHash } from "./getDockerBuildHash";
import type { ServiceManager } from "./ServiceManager";
import type {
  OnServiceLogs,
  prostglesServices,
  ServiceInstance,
} from "./ServiceManagerTypes";
import { isEqual } from "prostgles-types";
import { getEntries } from "@common/utils";
import { dockerInspect } from "./dockerInspect";

export async function buildService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: OnServiceLogs,
): Promise<ExecutionResult["state"]> {
  const onLogsCombined: OnServiceLogs = (logs) => {
    onLogs(logs);
    this.onServiceLog(serviceName, logs);
  };
  const existingService = this.activeServices.get(serviceName);
  if (existingService) {
    if (existingService.status === "building") {
      const res = await existingService.building;
      return res.state;
    }
    if (existingService.status === "running") {
      return "close";
    }
    this.activeServices.delete(serviceName);
  }

  const abortController = new AbortController();
  const stop = () => {
    abortController.abort();
  };
  const serviceCwd = join(
    __dirname,
    "../../../../",
    "/src/ServiceManager/services",
    serviceName,
    "src",
  );

  const imageName = camelCaseToSkewerCase(serviceName);

  /** Only rebuild if hash differs */
  const buildHash = await getDockerBuildHash(serviceCwd);
  const buildLabels = {
    "prostgles-build-hash": buildHash,
    app: "prostgles",
  };
  const labelArgs = getEntries(buildLabels).flatMap(([key, value]) => [
    "--label",
    `${key}=${value}`,
  ]);
  const matchingDockerImage = await dockerInspect(imageName);
  if (
    matchingDockerImage &&
    isEqual(matchingDockerImage.Config.Labels, buildLabels)
  ) {
    this.activeServices.set(serviceName, {
      status: "building-done",
      buildHash,
      labels: buildLabels,
      labelArgs,
    });
    return "close";
  }

  const instance: ServiceInstance = {
    status: "building",
    building: executeDockerCommand(
      ["build", "-t", imageName, ...labelArgs, "."],
      {
        timeout: 600_000,
        signal: abortController.signal,
        cwd: serviceCwd,
      },
      onLogsCombined,
    )
      .then((result) => {
        this.getActiveService(serviceName, "building");
        this.activeServices.set(serviceName, {
          status: "building-done",
          buildHash,
          labels: buildLabels,
          labelArgs,
        });
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
  const { state } = await instance.building;
  return state;
}

export const camelCaseToSkewerCase = (str: string) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};
