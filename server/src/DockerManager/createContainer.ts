import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import type { JSONB } from "prostgles-types";
import type { CreateContainerParams } from "./createContainer.schema";
import { executeDockerCommand, type ProcessLog } from "./executeDockerCommand";
import { getDockerRunArgs } from "./getDockerRunArgs";

type CreateContainerResult = {
  state: "finished" | "error" | "build-error" | "timed-out" | "aborted";
  log: ProcessLog[];
} & JSONB.GetObjectType<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["docker-sandbox"]["create_container"]["outputSchema"]["type"]
>;

export const createContainer = async (
  name: string,
  params: CreateContainerParams,
): Promise<CreateContainerResult> => {
  let localDir = "";
  try {
    const { files } = params;
    localDir = join(tmpdir(), name);

    mkdirSync(localDir, { recursive: true });
    const dockerFileName = "Dockerfile";
    const dockerFile = files[dockerFileName];
    if (!dockerFile) {
      throw new Error("Dockerfile is required in the files array");
    }
    if (dockerFile.toLowerCase().includes("expose")) {
      throw new Error("Dockerfile should not contain EXPOSE instruction");
    }

    for (const [name, content] of Object.entries(files)) {
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
      join(localDir, dockerFileName),
      localDir,
    ];
    const startTime = Date.now();
    const buildResult = await executeDockerCommand(buildArgs, {
      timeout: 300_000,
    });
    const buildDuration = Date.now() - startTime;

    if (buildResult.exitCode !== 0) {
      return {
        name,
        state: "build-error",
        command: ["docker", ...buildArgs].join(" "),
        log: buildResult.log,
        buildDuration,
        runDuration: -1,
        exitCode: buildResult.exitCode,
      };
    }

    const { runArgs, config } = getDockerRunArgs({
      ...params,
      name,
      localDir,
    });

    const runStartTime = Date.now();
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
      log: runResult.log,
      exitCode: runResult.exitCode,
      runDuration: Date.now() - runStartTime,
      buildDuration: Date.now() - startTime,
    };
  } finally {
    if (localDir) {
      rmSync(localDir, { recursive: true });
    }
  }
};
