import { randomUUID } from "crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import type { CreateContainerParams } from "./createContainer.schema";
import { executeDockerCommand } from "./executeDockerCommand";
import { getDockerRunArgs } from "./getDockerRunArgs";

type CreateContainerResult = {
  state: "finished" | "error" | "build-error" | "timed-out";
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const createContainer = async (
  params: CreateContainerParams,
): Promise<CreateContainerResult> => {
  let localDir = "";
  try {
    const { files } = params;
    const name = `prostgles-docker-mcp-sandbox-${Date.now()}-${randomUUID()}`;
    localDir = join(tmpdir(), name);

    mkdirSync(localDir, { recursive: true });

    const dockerFile = files.find(({ name }) => name === "Dockerfile");
    if (!dockerFile) {
      throw new Error("Dockerfile is required in the files array");
    }
    if (dockerFile.content.toLowerCase().includes("expose")) {
      throw new Error("Dockerfile should not contain EXPOSE instruction");
    }

    for (const { content, name } of files) {
      const tempFile = join(localDir, name);
      const dir = dirname(tempFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(tempFile, content);
    }

    const buildArgs = [
      "build",
      "-t",
      name,
      "-f",
      join(localDir, dockerFile.name),
      localDir,
    ];
    const buildResult = await executeDockerCommand(buildArgs, {
      timeout: 300_000,
    });

    if (buildResult.exitCode !== 0) {
      return {
        state: "build-error",
        command: ["docker", ...buildArgs].join(" "),
        stdout: buildResult.stdout,
        stderr: buildResult.stderr,
        exitCode: buildResult.exitCode,
      };
    }

    const { runArgs, config } = getDockerRunArgs({
      ...params,
      name,
      localDir,
    });

    const runResult = await executeDockerCommand(runArgs, {
      timeout: 30_000,
      ...config,
      ...params,
    });

    /** Cleanup */
    if (runResult.state === "timed-out") {
      await executeDockerCommand(["kill", name], { timeout: 60_000 });
    }
    await executeDockerCommand(["image", "rm", name], { timeout: 60_000 });

    return {
      command: ["docker", ...runArgs].join(" "),
      state: runResult.state === "close" ? "finished" : runResult.state,
      ...config,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      exitCode: runResult.exitCode,
    };
  } finally {
    if (localDir) {
      rmSync(localDir, { recursive: true });
    }
  }
};
