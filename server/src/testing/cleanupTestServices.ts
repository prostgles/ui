import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getServiceDockerPrefix } from "../dockerRuntime";

export const cleanupTestServices = async (instanceId: string) => {
  const servicePrefix = getServiceDockerPrefix(instanceId);
  // Remove containers before their named volumes and image tags.
  const containers = await listResources([
    "container",
    "ls",
    "--all",
    "--quiet",
    "--filter",
    `name=^/${servicePrefix}`,
  ]);
  if (containers.length) {
    await docker(["container", "rm", "--force", "--volumes", ...containers]);
  }
  const volumes = await listResources([
    "volume",
    "ls",
    "--quiet",
    "--filter",
    `name=^${servicePrefix}`,
  ]);
  if (volumes.length) await docker(["volume", "rm", ...volumes]);
  const images = await listResources([
    "image",
    "ls",
    "--format",
    "{{.Repository}}:{{.Tag}}",
    "--filter",
    `reference=${servicePrefix}*`,
  ]);
  // Delete only this deployment's tags: image layers may be shared with other apps.
  if (images.length) await docker(["image", "rm", ...images]);
};

const execFileAsync = promisify(execFile);
const docker = async (args: string[]) =>
  execFileAsync("docker", args, { timeout: 30_000, encoding: "utf8" });

const listResources = async (args: string[]) => {
  const { stdout } = await docker(args);
  return stdout.trim().split("\n").filter(Boolean);
};
