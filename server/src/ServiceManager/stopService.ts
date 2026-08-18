import { spawn } from "node:child_process";
import { resolveBinary } from "./resolveBinary";
import type { ServiceManager } from "./ServiceManager";
import { getContainerName } from "./startService";

export function stopService(
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
  spawn(resolveBinary("docker"), ["stop", "-t", "0", containerName], {
    stdio: "ignore",
  });
  this.activeServices.delete(serviceName);
  this.onServiceLog(serviceName, []);
}
