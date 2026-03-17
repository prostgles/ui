import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { JSONBTypeIfDefined } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServerTypes";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import type { CreateContainerParams } from "../ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getCreateContainerToolSchema";
import { createBridgeInternalDockerNetwork } from "./createBridgeInternalDockerNetwork";
import { executeDockerCommand, type ProcessLog } from "./executeDockerCommand";
import { getDockerRunArgs } from "./getDockerRunArgs";

type CreateContainerResult = JSONBTypeIfDefined<
  (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["run_code_in_sandbox"]["outputSchema"]
>;

type CreateContainerParamsWithBuildOptions = CreateContainerParams & {
  signal?: AbortSignal;
  buildNetworkMode?: CreateContainerParams["networkMode"];
  buildEnvironment?: Record<string, string>;
};

export const createContainer = async (
  name: string,
  params: CreateContainerParamsWithBuildOptions,
  onLogs?: (logs: ProcessLog[]) => void,
): Promise<CreateContainerResult> => {
  let localDir = "";
  try {
    const { files, signal } = params;
    localDir = join(tmpdir(), name);

    mkdirSync(localDir, { recursive: true });
    const dockerFileName = "Dockerfile";
    const dockerFile = files[dockerFileName];
    if (!dockerFile) {
      throw new Error("Dockerfile is required in the files");
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

    if (
      params.networkMode === "bridge-internal" ||
      params.buildNetworkMode === "bridge-internal"
    ) {
      await createBridgeInternalDockerNetwork();
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
    const buildResult = await executeDockerCommand(
      buildArgs,
      {
        timeout: 300_000,
        signal,
      },
      onLogs,
    );
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
    const runResult = await executeDockerCommand(
      runArgs,
      {
        timeout: 30_000,
        ...config,
        ...params,
        signal,
      },
      onLogs,
    );

    /** Cleanup */
    if (runResult.state !== "close") {
      await executeDockerCommand(["kill", name], { timeout: 60_000 });
    }
    await executeDockerCommand(["image", "rm", name], { timeout: 60_000 });

    return {
      command: ["docker", ...runArgs].join(" "),
      state: runResult.state === "close" ? "finished" : runResult.state,
      name: config.name,
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
