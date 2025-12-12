import { executeDockerCommand } from "./executeDockerCommand";

export const getContainerLogs = async (containerId: string) => {
  const result = await executeDockerCommand(
    [
      "logs",
      // "--timestamps",
      "--details",
      // "--tail",
      // "all",
      containerId,
    ],
    { timeout: 5000 },
  );

  return result;
};
