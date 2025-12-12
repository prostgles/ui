import { execSync } from "child_process";

export const getDockerGatewayIP = () => {
  let dockerGatewayIP = "172.17.0.1";
  try {
    const actualDockerGatewayIP = execSync(
      `docker network inspect bridge --format='{{(index .IPAM.Config 0).Gateway}}'`,
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
