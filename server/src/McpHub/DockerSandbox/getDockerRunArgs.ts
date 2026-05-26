import { isDocker } from "@src/McpHub/utils";
import { readFileSync } from "fs";
import { join } from "path";
import type { CreateContainerParams } from "../ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getContainerToolSchemas";
import type { StrictOmit } from "@common/utils";

const CUSTOM_BRIDGE_NETWORK_NAME = "prostgles-bridge-net";
export const INTERNAL_BRIDGE_NETWORK_NAME = "prostgles-bridge-internal-net";

/** Test compose network names */
if (process.env.NODE_ENV === "development") {
  const dockerComposeFile = readFileSync(
    join(__dirname, "..", "..", "..", "..", "..", "..", "docker-compose.yml"),
    "utf8",
  );
  const networksSection = dockerComposeFile.split("networks:")[1];
  if (!networksSection?.includes(`name: ${CUSTOM_BRIDGE_NETWORK_NAME}`)) {
    throw new Error(
      `Docker compose file must include a network named ${CUSTOM_BRIDGE_NETWORK_NAME}`,
    );
  }
}

const LABEL = "prostgles-docker-sandbox";

export type LocalDockerParams = {
  user?: string;
  workingDir?: string;
  volumes?: Array<{
    host: string;
    container: string;
    readOnly?: boolean;
  }>;
  localDir: string;
  name: string;
};

export const getNetworkName = (
  networkMode: CreateContainerParams["networkMode"] = "none",
) => {
  return (
    networkMode === "bridge-internal" ? INTERNAL_BRIDGE_NETWORK_NAME
    : isDocker && networkMode === "bridge" ? CUSTOM_BRIDGE_NETWORK_NAME
    : networkMode
  );
};

export const getDockerRunArgs = ({
  cpus = "1",
  memory = "512m",
  networkMode = "none",
  user = "nobody",
  workingDir = "/workspace",
  environment = {},
  volumes,
  name,
  readOnly = true,
}: Pick<
  CreateContainerParams,
  "cpus" | "memory" | "networkMode" | "environment" | "readOnly"
> &
  StrictOmit<LocalDockerParams, "localDir">) => {
  const runArgs = ["run", "--rm", "--interactive"];

  // Resource limits
  if (memory) {
    runArgs.push("--memory", memory);
  }

  if (cpus) {
    runArgs.push("--cpus", cpus);
  }

  // Network settings
  const selectedNetwork = getNetworkName(networkMode);
  runArgs.push("--network", selectedNetwork);

  // User
  if (user) {
    runArgs.push("--user", user);
  }

  if (readOnly) {
    runArgs.push("--read-only");
  }

  // Environment variables
  Object.entries(environment).forEach(([key, value]) => {
    runArgs.push("--env", `${key}=${value}`);
  });

  if (volumes) {
    volumes.forEach((volume) => {
      const volumeStr =
        volume.readOnly ?
          `${volume.host}:${volume.container}:ro`
        : `${volume.host}:${volume.container}`;
      runArgs.push("-v", volumeStr);
    });
  }

  runArgs.push("--label", LABEL, "--name", name);

  // Security options
  runArgs.push("--security-opt", "no-new-privileges");
  runArgs.push("--cap-drop", "ALL");

  runArgs.push(name);

  return {
    runArgs,
    config: { user, workingDir, volumes, name },
  };
};
