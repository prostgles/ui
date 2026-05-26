import { isDocker } from "../utils";
import { executeDockerCommand } from "./executeDockerCommand";
import { INTERNAL_BRIDGE_NETWORK_NAME } from "./getDockerRunArgs";

export const createBridgeInternalDockerNetwork = async () => {
  if (isDocker) return;

  const networkExistsResult = await executeDockerCommand(
    ["network", "inspect", INTERNAL_BRIDGE_NETWORK_NAME],
    { timeout: 30_000 },
  );
  if (
    networkExistsResult.state !== "close" ||
    networkExistsResult.exitCode !== 0
  ) {
    const createNetworkResult = await executeDockerCommand(
      [
        "network",
        "create",
        "--driver",
        "bridge",
        "--internal",
        INTERNAL_BRIDGE_NETWORK_NAME,
      ],
      { timeout: 30_000 },
    );
    if (createNetworkResult.exitCode !== 0) {
      console.error(
        `Failed to create internal bridge network`,
        createNetworkResult.log,
      );
      throw new Error(`Failed to create internal bridge network`);
    }
  }
};
