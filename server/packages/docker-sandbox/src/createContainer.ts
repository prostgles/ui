import { randomUUID } from "crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import { executeDockerCommand } from "./executeDockerCommand";
import { getDockerRunArgs } from "./getDockerRunArgs";

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;

type CreateContainerResult = {
  state: "finished" | "error" | "build-error" | "timed-out";
  command: string;
  containerId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const createContainer = async (
  params: CreateContainerParams,
): Promise<CreateContainerResult> => {
  let localDir = "";
  try {
    const { files, timeout = 30_000 } = params;
    const name = `prostgles-docker-mcp-sandbox-${Date.now()}-${randomUUID()}`;
    localDir = join(tmpdir(), name);

    mkdirSync(localDir, { recursive: true });

    const dockerFile = files.find(({ name }) => name === "Dockerfile");
    if (!dockerFile) {
      throw new Error("Dockerfile is required in the files array");
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
        containerId: "",
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

    const containerId = runResult.stdout.trim();

    return {
      command: ["docker", ...runArgs].join(" "),
      state: runResult.state === "close" ? "finished" : runResult.state,
      // runResult.stderr ? "error"
      // : runResult.exitCode === 0 ? "finished"
      // : "timed-out",
      containerId,
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

const filesSchema = {
  description: "Files to copy into the container. Must include a Dockerfile",
  arrayOfType: {
    name: { type: "string", description: "File name. E.g.: 'index.ts' " },
    content: {
      type: "string",
      description:
        "File content. E.g.: 'import type { JSONB } from \"prostgles-types\";' ",
    },
  },
} as const satisfies JSONB.JSONBSchema;

export const createContainerSchema = {
  description: "Create a new Docker sandbox container",
  type: {
    files: filesSchema,
    timeout: {
      type: "number",
      optional: true,
      description:
        "Maximum time in milliseconds the container will be allowed to run. Defaults to 30000. ",
      // default: 30000,
    },
    networkMode: {
      enum: ["none", "bridge", "host"],
      description: "Network mode for the container. Defaults to 'none'",
      // default: "none",
      optional: true,
    },
    environment: {
      description: "Environment variables to set in the container",
      record: { values: "string", partial: true },
      optional: true,
    },
    memory: {
      type: "string",
      description: "Memory limit (e.g., '512m', '1g'). Defaults to 512m",
      optional: true,
      // default: "512m",
    },
    cpus: {
      type: "string",
      description: "CPU limit (e.g., '0.5', '1'). Defaults to 1",
      optional: true,
      // default: "1",
    },
  },
} as const satisfies JSONB.JSONBSchema;
const { $id, $schema, ...createContainerJSONSchema } =
  getJSONBSchemaAsJSONSchema("", "", createContainerSchema);
export { createContainerJSONSchema };
