import type { CreateContainerParams } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getCreateContainerToolSchema";
import { execSync } from "child_process";
import { INTERNAL_BRIDGE_NETWORK_NAME } from "../getDockerRunArgs";

export const getDockerGatewayIP = (
  networkMode: CreateContainerParams["networkMode"],
) => {
  let dockerGatewayIP = "172.17.0.1";
  try {
    const networkName =
      networkMode === "bridge-internal" ?
        INTERNAL_BRIDGE_NETWORK_NAME
      : "bridge";
    const actualDockerGatewayIP = execSync(
      `docker network inspect ${networkName} --format='{{(index .IPAM.Config 0).Gateway}}'`,
    )
      .toString()
      .trim();
    if (actualDockerGatewayIP) {
      dockerGatewayIP = actualDockerGatewayIP;
    }
  } catch (error) {
    console.error("Failed to get Docker gateway IP, using default: ", error);
  }

  return dockerGatewayIP;
};
