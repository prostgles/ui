import {
  executeDockerCommand,
  type ExecutionResult,
  type ProcessLog,
} from "@src/DockerManager/executeDockerCommand";
import { spawn } from "child_process";
import { tout } from "..";
import type { ServiceManager } from "./ServiceManager";
import {
  prostglesServices,
  type OnServiceLogs,
  type ProstglesService,
  type RunningServiceInstance,
  type ServiceInstance,
} from "./ServiceManagerTypes";
import { camelCaseToSkewerCase } from "./buildService";
import { getServiceEndoints } from "./getServiceEndoints";

export async function startService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: OnServiceLogs,
): Promise<Extract<ServiceInstance, { status: "running" }>> {
  const onLogsCombined: OnServiceLogs = (logs) => {
    onLogs(logs);
    this.onServiceLog(serviceName, logs);
  };
  const { labels, labelArgs } = this.getActiveService(
    serviceName,
    "building-done",
  );

  const serviceConfig: ProstglesService = prostglesServices[serviceName];
  const abortController = new AbortController();
  let logs: ProcessLog[] = [];
  const getLogs = () => {
    return logs;
  };
  const stop = () => abortController.abort();
  this.activeServices.set(serviceName, { getLogs, stop, status: "starting" });
  const imageName = camelCaseToSkewerCase(serviceName);
  const containerName = `prostgles-service-${imageName}`;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise(async (resolve, reject) => {
    const onStopped = (
      res: ExecutionResult | { type: "error"; error: any },
    ) => {
      const stopReason = "type" in res ? res.type : res.state;
      this.activeServices.set(serviceName, {
        status: "error",
        error: new Error(
          `Service ${serviceName} stopped unexpectedly with state: ${stopReason}`,
        ),
      });
      return reject(
        new Error(
          `Service ${serviceName} stopped unexpectedly with state: ${stopReason}`,
        ),
      );
    };

    const cleanup = () => {
      spawn("docker", ["stop", "-t", "0", containerName], { stdio: "ignore" });
    };
    process.once("exit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
    process.once("uncaughtException", cleanup);

    const volumeArgs: string[] = [];
    for (const [volumeName, containerPath] of Object.entries(
      serviceConfig.volumes || {},
    )) {
      const hostPath = `prostgles-service-${imageName}-${volumeName}`;
      await executeDockerCommand(["volume", "create", hostPath], {
        timeout: 10_000,
      });
      volumeArgs.push("-v", `${hostPath}:${containerPath}`);
    }

    executeDockerCommand(
      [
        "run",
        "-i",
        "--rm",
        "--init",
        ...labelArgs,
        "--name",
        containerName,
        "-p",
        `127.0.0.1:${serviceConfig.port}:${serviceConfig.port}`,
        ...volumeArgs,
        ...Object.entries(serviceConfig.env || {}).flatMap(([key, value]) => [
          "-e",
          `${key}=${value}`,
        ]),
        imageName,
      ],
      {
        signal: abortController.signal,
      },
      (newLogs) => {
        logs = newLogs;
        onLogsCombined(logs);
      },
    )
      .then((res) => {
        onStopped(res);
      })
      .catch((error) => {
        onStopped({ type: "error", error });
      });

    while (this.activeServices.get(serviceName)?.status === "starting") {
      const healthCheck = await fetch(
        `http://127.0.0.1:${serviceConfig.port}${serviceConfig.healthCheckEndpoint}`,
      ).catch(() => null);
      if (healthCheck?.ok) {
        break;
      }
      await tout(1000);
    }

    const runningService: RunningServiceInstance = {
      status: "running",
      getLogs,
      stop,
      endpoints: getServiceEndoints(serviceName, serviceConfig),
    };
    //@ts-ignore
    this.activeServices.set(serviceName, runningService);
    this.onServiceLog(serviceName, logs);

    resolve(runningService);
  });
}

export const getContainerName = (
  serviceName: keyof typeof prostglesServices,
) => {
  return `prostgles-service-${camelCaseToSkewerCase(serviceName)}`;
};
