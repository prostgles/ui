import { executeDockerCommand } from "./executeDockerCommand";
import { getContainerLogs } from "./getContainerLogs";

export interface ContainerInfo {
  id: string;
  status: "created" | "running" | "stopped" | "error" | "exited";
  image: string;
  createdAt: Date;
}

/**
 * Get container information
 */
export const getContainerInfo = async (containerId: string) => {
  const info = await executeDockerCommand(
    [
      "inspect",
      "--format",
      "{{.State.Status}}|{{.Config.Image}}|{{.Created}}",
      containerId,
    ],
    { timeout: 2000 },
  );

  if (info.exitCode !== 0) {
    return null;
  }

  const logs = await getContainerLogs(containerId);

  const [status, image, created] = info.stdout.trim().split("|");

  return {
    id: containerId,
    status: status as ContainerInfo["status"],
    image,
    createdAt: new Date(created),
    logs,
  };
};
