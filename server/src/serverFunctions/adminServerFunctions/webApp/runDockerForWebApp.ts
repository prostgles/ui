import { executeDockerCommand } from "@src/McpHub/DockerSandbox/executeDockerCommand";

export const runDockerForWebApp = async ({
  shCommand,
  web_app_directory,
  image,
  timeout = 120_000,
  env = {},
  ipc,
  network,
}: {
  web_app_directory: string;
  shCommand: string;
  timeout?: number;
  image: "node:20-slim" | "mcr.microsoft.com/playwright:v1.58.0-noble";
  env?: Record<string, string>;
  /**
   * Needed for Playwright
   */
  ipc?: "host" | undefined;
  network?: "host" | undefined;
}) => {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (uid === undefined || gid === undefined) {
    throw "Cannot get user or group id for current process";
  }
  const result = await executeDockerCommand(
    [
      "run",
      "--rm",
      ...(ipc ? ["--ipc", ipc] : []),
      ...(network ? ["--network", network] : []),
      `-u`,
      `${uid}:${gid}`,
      "-v",
      `${web_app_directory}:/app`,
      "-w",
      "/app",
      ...Object.entries(env).flatMap(([key, value]) => [
        "-e",
        `${key}=${value}`,
      ]),
      image,
      "sh",
      "-c",
      shCommand,
    ],
    {
      cwd: web_app_directory,
      timeout,
    },
  );

  return result;
};
