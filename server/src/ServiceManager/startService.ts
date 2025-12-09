import {
  executeDockerCommand,
  type ExecutionResult,
  type ProcessLog,
} from "@src/DockerManager/executeDockerCommand";
import type { ServiceManager } from "./ServiceManager";
import {
  prostglesServices,
  type OnServiceLogs,
  type ServiceInstance,
} from "./ServiceManagerTypes";
import { camelCaseToSkewerCase } from "./buildService";
import { tout } from "..";
import { spawn } from "child_process";

export async function startService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: OnServiceLogs,
): Promise<Extract<ServiceInstance, { status: "running" }>> {
  const onLogsCombined: OnServiceLogs = (logs) => {
    onLogs(logs);
    this.onServiceLog(serviceName, logs);
  };
  this.getActiveService(serviceName, "building-done");

  const serviceConfig = prostglesServices[serviceName];
  const abortController = new AbortController();
  let logs: ProcessLog[] = [];
  const getLogs = () => {
    return logs;
  };
  const stop = () => abortController.abort();
  this.activeServices.set(serviceName, { getLogs, stop, status: "starting" });
  const containerName = `prostgles-service-${camelCaseToSkewerCase(serviceName)}`;

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
      spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    };
    process.once("exit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
    process.once("uncaughtException", cleanup);

    executeDockerCommand(
      [
        "run",
        "-i",
        "--rm",
        "--init",
        "--label",
        "prostgles",
        "--name",
        containerName,
        "-p",
        `127.0.0.1:${serviceConfig.port}:${serviceConfig.port}`,
        ...Object.entries(serviceConfig.env || {}).flatMap(([key, value]) => [
          "-e",
          `${key}=${value}`,
        ]),
        camelCaseToSkewerCase(serviceName),
      ],
      {
        timeout: 300_000,
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

    const runningService = {
      status: "running",
      getLogs,
      stop,
    } satisfies ServiceInstance;
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
