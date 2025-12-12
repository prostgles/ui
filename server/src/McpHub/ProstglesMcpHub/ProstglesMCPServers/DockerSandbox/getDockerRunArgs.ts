import type { CreateContainerParams } from "./fetchTools";

const CUSTOM_BRIDGE_NETWORK_NAME = "prostgles-bridge-net";
const LABEL = "prostgles-docker-sandbox";

type LocalDockerParams = {
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

const isDocker = Boolean(process.env.IS_DOCKER);

export const getDockerRunArgs = ({
  cpus = "1",
  memory = "512m",
  networkMode = "none",
  user = "nobody",
  workingDir = "/workspace",
  environment = {},
  volumes,
  localDir,
  name,
}: CreateContainerParams & LocalDockerParams) => {
  const runArgs = ["run", "--rm", "--interactive"];

  // Resource limits
  if (memory) {
    runArgs.push("--memory", memory);
  }

  if (cpus) {
    runArgs.push("--cpus", cpus);
  }

  // Network settings
  if (networkMode === "bridge" && isDocker) {
    runArgs.push("--network", CUSTOM_BRIDGE_NETWORK_NAME);
  } else {
    runArgs.push("--network", networkMode);
  }

  // User
  if (user) {
    runArgs.push("--user", user);
  }

  runArgs.push("--read-only");

  // Environment variables
  Object.entries(environment).forEach(([key, value]) => {
    runArgs.push("--env", `${key}=${value}`);
  });

  // Volumes
  // runArgs.push("-v", `${localDir}:${workingDir}`);
  // if (volumes) {
  //   volumes.forEach((volume) => {
  //     const volumeStr =
  //       volume.readOnly ?
  //         `${volume.host}:${volume.container}:ro`
  //       : `${volume.host}:${volume.container}`;
  //     runArgs.push("-v", volumeStr);
  //   });
  // }

  runArgs.push("--label", LABEL, "--name", name);

  // Security options
  runArgs.push("--security-opt", "no-new-privileges");
  runArgs.push("--cap-drop", "ALL");

  runArgs.push(name);

  return {
    runArgs,
    config: { user, workingDir, volumes, localDir, name },
  };
};
