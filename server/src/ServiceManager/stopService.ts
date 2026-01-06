import { spawn } from "node:child_process";
import type { ServiceManager } from "./ServiceManager";
import type { prostglesServices } from "./ServiceManagerTypes";
import { getContainerName } from "./startService";

export function stopService(
  this: ServiceManager,
  serviceName: keyof typeof prostglesServices,
) {
  try {
    const service = this.getService(serviceName);
    if (service && "stop" in service) {
      service.stop();
    }
  } catch {}
  const containerName = getContainerName(serviceName);
  spawn("docker", ["stop", "-t", "0", containerName], { stdio: "ignore" });
  this.activeServices.delete(serviceName);
  this.onServiceLog(serviceName, []);
}
