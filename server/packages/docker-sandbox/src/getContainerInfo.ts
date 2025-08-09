import { executeDockerCommand } from "./executeDockerCommand";

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
  const result = await executeDockerCommand([
    "inspect",
    "--format",
    "{{.State.Status}}|{{.Config.Image}}|{{.Created}}",
    containerId,
  ]);

  if (result.exitCode !== 0) {
    return null;
  }

  const [status, image, created] = result.stdout.trim().split("|");

  return {
    id: containerId,
    status: status as ContainerInfo["status"],
    image,
    createdAt: new Date(created),
  };
};
