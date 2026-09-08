import { filterArr } from "@common/llmUtils";
import { getEntries } from "@common/utils";
import {
  executeDockerCommand,
  type ExecutionResult,
} from "@src/McpHub/DockerSandbox/executeDockerCommand";
import { join, resolve } from "path";
import { isEqual, pickKeys } from "prostgles-types";
import { dockerInspect } from "./dockerInspect";
import { getDockerBuildHash } from "./getDockerBuildHash";
import { getSelectedConfigEnvs } from "./getSelectedConfigEnvs";
import type { ServiceManager } from "./ServiceManager";
import { OnServiceLogs, ServiceInstance } from "./ServiceManagerTypes";
import { getServiceDockerResources } from "@src/dockerRuntime";

export async function buildService(
  this: ServiceManager,
  serviceName: string,
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

  const service = this.services[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} not found in service registry`);
  }
  const serviceCwd = resolve(
    this.getServiceRoot(serviceName),
    service.buildContext ?? join(serviceName, "src"),
  );

  const { imageName } = getServiceDockerResources(serviceName);

  const { buildArgs } = await getSelectedConfigEnvs(this, serviceName);
  /** Only rebuild if hash differs */
  const buildHash = await getDockerBuildHash(serviceCwd, buildArgs);
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
    isEqual(
      /** Some labels end up populated  (e.g.: org.opencontainers....)  */
      pickKeys(matchingDockerImage.Config.Labels, Object.keys(buildLabels)),
      buildLabels,
    )
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
      ["build", ...buildArgs, "-t", imageName, ...labelArgs, "."],
      {
        timeout: 600_000,
        signal: abortController.signal,
        cwd: serviceCwd,
      },
      onLogsCombined,
    )
      .then((result) => {
        this.getActiveService(serviceName, "building");
        if (result.state !== "close") {
          this.activeServices.set(serviceName, {
            status: "build-error",
            error:
              result.state === "aborted" ? "aborted"
              : result.state === "timed-out" ? "timed-out"
              : (filterArr(result.log, { type: "error" })[0] ??
                result.log.at(-1)),
          });
          return result;
        } else {
          this.activeServices.set(serviceName, {
            status: "building-done",
            buildHash,
            labels: buildLabels,
            labelArgs,
          });
        }
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
  const { state, log } = await instance.building;
  onLogsCombined(log);
  return state;
}
