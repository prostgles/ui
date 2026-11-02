import { executeDockerCommand } from "@src/McpHub/DockerSandbox/executeDockerCommand";
import type { ServiceManager } from "./ServiceManager";
import { getContainerName } from "./startService";

export async function stopService(
  this: ServiceManager<Record<string, any>>,
  serviceName: string,
) {
  try {
    const service = this.getService(serviceName);
    if (service && "stop" in service) {
      service.stop();
    }
  } catch {}
  const containerName = getContainerName(serviceName);
  const stopResult = await executeDockerCommand(
    ["stop", "-t", "0", containerName],
    {
      timeout: 10_000,
    },
  );
  if (stopResult.state !== "close") {
    const containerListResult = await executeDockerCommand(
      ["container", "ls", "--all", "--format", "{{.Names}}"],
      { timeout: 10_000 },
    );
    const containerStillExists = containerListResult.log
      .filter(({ type }) => type === "stdout")
      .map(({ text }) => text)
      .join("")
      .split("\n")
      .some((name) => name.trim() === containerName);
    if (containerListResult.state !== "close" || containerStillExists) {
      const stopLogs = stopResult.log
        .map(({ text }) => text)
        .join("")
        .trim();
      throw new Error(
        `Failed to stop service ${serviceName} (${stopResult.state}): ${stopLogs}`,
        { cause: stopResult },
      );
    }
  }
  this.activeServices.delete(serviceName);
  this.onServiceLog(serviceName, []);
}
