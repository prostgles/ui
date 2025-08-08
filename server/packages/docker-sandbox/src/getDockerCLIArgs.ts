import type { CreateContainerParams } from "./createContainer";

const LABEL = "prostgles-docker-sandbox";

type LocalDockerParams = {
  user?: string;
  readOnly?: boolean;
  workingDir?: string;
  volumes?: Array<{
    host: string;
    container: string;
    readOnly?: boolean;
  }>;
  localDir: string;
  name: string;
};

export const getDockerCLIArgs = ({
  cpus = "1",
  memory = "512m",
  networkMode = "none",
  user = "nobody",
  readOnly = false,
  workingDir = "/workspace",
  environment,
  volumes,
  localDir,
  name,
}: CreateContainerParams & LocalDockerParams) => {
  const args = ["--rm", "--interactive", "--tty", "--detach"];

  // Resource limits
  if (memory) {
    args.push("--memory", memory);
  }

  if (cpus) {
    args.push("--cpus", cpus);
  }

  // Network settings
  args.push("--network", networkMode);

  // User
  if (user) {
    args.push("--user", user);
  }

  // Read-only filesystem
  if (readOnly) {
    args.push("--read-only");
  }

  // Working directory
  if (workingDir) {
    args.push("--workdir", workingDir);
  }

  // Environment variables
  if (environment) {
    Object.entries(environment).forEach(([key, value]) => {
      args.push("--env", `${key}=${value}`);
    });
  }

  // Volumes
  args.push("-v", `${localDir}:${workingDir || "/workspace"}`);

  if (volumes) {
    volumes.forEach((volume) => {
      const volumeStr =
        volume.readOnly ?
          `${volume.host}:${volume.container}:ro`
        : `${volume.host}:${volume.container}`;
      args.push("-v", volumeStr);
    });
  }
  args.push("--label", LABEL, "--name", name);

  // Security options
  args.push("--security-opt", "no-new-privileges");
  args.push("--cap-drop", "ALL");

  // Command to run - either custom startup command or default keep-alive
  // if (startupCommand) {
  //   // Split the startup command properly
  //   args.push("sh", "-c", startupCommand);
  // } else {
  // Keep container running with default command
  args.push("tail", "-f", "/dev/null");
  // }

  return args;
};
