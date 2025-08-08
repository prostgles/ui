import { randomUUID } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { rm } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { getJSONBSchemaAsJSONSchema, type JSONB } from "prostgles-types";
import { executeDockerCommand } from "./executeDockerCommand";
import { getDockerCLIArgs } from "./getDockerCLIArgs";
import { waitForContainer } from "./waitForContainer";

export type CreateContainerParams = JSONB.GetSchemaType<
  typeof createContainerSchema
>;
export const createContainer = async (params: CreateContainerParams) => {
  const { files } = params;
  const name = `prostgles-docker-mcp-sandbox-${Date.now()}-${randomUUID()}`;
  const localDir = join(tmpdir(), name);

  try {
    // Create temporary directory for file sharing
    mkdirSync(localDir, { recursive: true });

    const dockerFile = files.find(({ name }) => name === "Dockerfile");
    if (!dockerFile) {
      throw new Error("Dockerfile is required in the files array");
    }
    for (const { content, name } of files) {
      // Create temporary file
      const tempFile = join(localDir, name);
      const dir = dirname(tempFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(tempFile, content);
    }

    const buildResult = await executeDockerCommand([
      "build",
      "-t",
      name,
      "-f",
      join(localDir, dockerFile.name),
      localDir,
    ]);

    if (buildResult.exitCode !== 0) {
      throw new Error(
        `Failed to build the container image: ${buildResult.stderr}`,
      );
    }

    const dockerArgs = getDockerCLIArgs({ ...params, name, localDir });

    // Start container
    const result = await executeDockerCommand([
      "run",
      "-d",
      "-i",
      name,
      ...dockerArgs,
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to start container: ${result.stderr}`);
    }
    console.error(result);
    const containerId = result.stdout.trim();
    // const isRunning = true;

    // this.emit("started", { containerId });

    // Wait for container to be ready
    await waitForContainer(containerId);
  } catch (error) {
    await cleanup(localDir);
    throw error;
  }
};

const cleanup = async (localDir: string) => {
  try {
    await rm(localDir, { recursive: true });
  } catch (error: any) {
    // Ignore cleanup errors
    console.error(`Failed to clean up temp directory: ${error}`);
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
