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
import { getSelectedConfigEnvs } from "./getSelectedConfigEnvs";
import {
  executeDockerCommand,
  type ExecutionResult,
  type ProcessLog,
} from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import { getFreePort } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/dockerMCPServerProxy/isPortFree";

export async function startService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
  onLogs: OnServiceLogs,
): Promise<Extract<ServiceInstance, { status: "running" }>> {
  const onLogsCombined: OnServiceLogs = (logs) => {
    onLogs(logs);
    this.onServiceLog(serviceName, logs);
  };
  const { labelArgs } = this.getActiveService(serviceName, "building-done");

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

  const cleanup = () => {
    spawn("docker", ["stop", "-t", "0", containerName], { stdio: "ignore" });
  };
  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
  process.once("uncaughtException", cleanup);

  const {
    port,
    hostPort: preferredHostPort = port,
    volumes = {},
    healthCheck,
    endpoints,
    gpus = "none",
  } = serviceConfig;
  const hostPort = await getFreePort(preferredHostPort);
  const volumeArgs: string[] = [];
  for (const [volumeName, containerPath] of Object.entries(volumes)) {
    const hostPath = `prostgles-service-${imageName}-${volumeName}`;
    await executeDockerCommand(["volume", "create", hostPath], {
      timeout: 10_000,
    });
    volumeArgs.push("-v", `${hostPath}:${containerPath}`);
  }

  const { env } = await getSelectedConfigEnvs(this.dbs, serviceName);

  const baseHost = `127.0.0.1:${hostPort}`;

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
      this.onServiceLog(serviceName, logs);
      return reject(
        new Error(
          `Service ${serviceName} stopped unexpectedly with state: ${stopReason}`,
        ),
      );
    };

    executeDockerCommand(
      [
        "run",
        "-i",
        "--rm",
        "--init",
        ...labelArgs,
        "--name",
        containerName,
        ...(gpus !== "none" ?
          [
            "--gpus",
            Array.isArray(gpus) ?
              `"device=${gpus.join(",")}"`
            : gpus.toString(),
          ]
        : []),
        "-p",
        `${baseHost}:${port}`,
        ...volumeArgs,
        ...Object.entries(env).flatMap(([key, value]) => [
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
      .catch((error: unknown) => {
        onStopped({ type: "error", error });
      });

    const baseUrl = `http://${baseHost}`;
    while (this.activeServices.get(serviceName)?.status === "starting") {
      const clientIp = "127.0.0.1";
      const healthCheckResponse = await fetch(
        `${baseUrl}${healthCheck.endpoint}`,
        {
          method: healthCheck.method ?? "GET",
          headers: {
            "X-Forwarded-For": clientIp,
            "X-Real-IP": clientIp,
          },
        },
      ).catch(() => null);
      if (healthCheckResponse?.ok) {
        break;
      }
      await tout(1000);
    }

    if (this.activeServices.get(serviceName)?.status !== "starting") {
      return;
    }

    const runningService: RunningServiceInstance = {
      status: "running",
      getLogs,
      stop,
      endpoints: getServiceEndoints({ serviceName, baseUrl, endpoints }),
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
