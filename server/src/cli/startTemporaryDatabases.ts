import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const TEST_DATABASE_NAMESPACE = "prostgles_test_";
const DEFAULT_POSTGRES_IMAGE = "postgis/postgis:17-3.6-alpine";
const START_TIMEOUT_MS = 60_000;

export const startTemporaryDatabases = async ({
  configPath,
  configId,
  postgresImage,
  startupTimeoutMs,
  logPath,
}: {
  logPath: string;
  configPath: string;
  configId: string;
  postgresImage?: string;
  startupTimeoutMs?: number;
}) => {
  await mkdir(path.dirname(logPath), { recursive: true });
  const configuredImage =
    postgresImage ?? process.env.PROSTGLES_TEST_POSTGRES_IMAGE;
  const dbDockerfile = path.join(configPath, "DB.Dockerfile");
  let image = configuredImage;
  if (!image && existsSync(dbDockerfile)) {
    const imageTag = `prostgles-test-${validatePrefix(configId).replaceAll("_", "-") || "app"}-db`;
    const buildArgs = [
      "build",
      "--quiet",
      "--file",
      dbDockerfile,
      "--tag",
      imageTag,
      configPath,
    ];
    const buildResult = await runDocker(buildArgs);
    if (buildResult.exitCode !== 0) {
      throw getDockerError(buildArgs, buildResult);
    }
    image = imageTag;
  }
  image ??= DEFAULT_POSTGRES_IMAGE;

  const prefix = validatePrefix(configId);
  const runId = randomBytes(6).toString("hex");
  const baseName = `${TEST_DATABASE_NAMESPACE}${prefix ? `${prefix}_` : ""}${runId}`;
  const stateName = `${baseName}_state`;
  const projectName = `${baseName}_project`;
  const username = "prostgles_test";
  const password = randomBytes(24).toString("base64url");
  const containerName = `prostgles-test-${prefix ? `${prefix.replaceAll("_", "-")}-` : ""}${runId}`;
  const runArgs = [
    "run",
    "--detach",
    "--name",
    containerName,
    "--label",
    "prostgles.test-deployment=true",
    "--publish",
    "127.0.0.1::5432",
    "--env",
    `POSTGRES_USER=${username}`,
    "--env",
    `POSTGRES_PASSWORD=${password}`,
    "--env",
    "POSTGRES_DB=postgres",
    image,
  ];
  const runResult = await runDocker(runArgs);
  if (runResult.exitCode !== 0) throw getDockerError(runArgs, runResult);

  const logFile = await open(logPath, "w").catch(async (error: unknown) => {
    await runDocker(["rm", "--force", containerName]);
    throw error;
  });
  const logProcess = spawn("docker", ["logs", "--follow", containerName], {
    stdio: ["ignore", logFile.fd, logFile.fd],
  });
  const logsClosed = new Promise<void>((resolve) => {
    logProcess.once("close", () => resolve());
  });
  logProcess.on("error", console.error);
  await logFile.close();
  console.log(`PostgreSQL log file: ${logPath}`);

  const dispose = async () => {
    // Stop before collecting the final logs so shutdown messages are retained.
    try {
      await runDocker(["stop", "--time", "5", containerName]);
      logProcess.kill();
      await logsClosed;
      const logs = await runDocker(["logs", containerName]);
      if (logs.exitCode !== 0) throw getDockerError(["logs"], logs);
      await writeFile(logPath, logs.stdout + logs.stderr);
    } finally {
      logProcess.kill();
      await removeContainer(containerName);
    }
  };

  try {
    const portArgs = ["port", containerName, "5432/tcp"];
    const portResult = await runDocker(portArgs);
    if (portResult.exitCode !== 0) throw getDockerError(portArgs, portResult);
    const portText = portResult.stdout.trim();
    if (!portText.startsWith("127.0.0.1:") || portText.includes("\n")) {
      throw new Error(
        `Refusing a PostgreSQL test container not bound exclusively to 127.0.0.1: ${portText}`,
      );
    }
    const separatorIndex = portText.lastIndexOf(":");
    const port = Number(portText.slice(separatorIndex + 1));
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(
        `Docker returned an invalid PostgreSQL port: ${portText}`,
      );
    }

    const maintenanceUrl = getDatabaseUrl(port, username, password, "postgres");
    const startedAt = Date.now();
    let lastConnectionError: unknown;
    let maintenance: Client | undefined;
    while (Date.now() - startedAt < (startupTimeoutMs ?? START_TIMEOUT_MS)) {
      const candidate = new Client({ connectionString: maintenanceUrl });
      try {
        await candidate.connect();
        maintenance = candidate;
        break;
      } catch (error) {
        lastConnectionError = error;
        await candidate.end().catch(() => undefined);
        await delay(200);
      }
    }
    if (!maintenance) {
      const logs = await runDocker(["logs", containerName]);
      throw new Error(
        `Timed out waiting for the test PostgreSQL container.\n${logs.stdout}${logs.stderr}`,
        { cause: lastConnectionError },
      );
    }
    try {
      await maintenance.query(`CREATE DATABASE "${stateName}"`);
      await maintenance.query(`CREATE DATABASE "${projectName}"`);
    } finally {
      await maintenance.end();
    }
    return {
      dispose,
      project: {
        name: projectName,
        url: getDatabaseUrl(port, username, password, projectName),
      },
      state: {
        name: stateName,
        url: getDatabaseUrl(port, username, password, stateName),
      },
    };
  } catch (error) {
    await dispose().catch(() => undefined);
    throw new Error(`Temporary PostgreSQL setup failed. Log file: ${logPath}`, {
      cause: error,
    });
  }
};

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const runCommand = async (command: string, args: string[]) =>
  await new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stderr, stdout });
    });
  });

const runDocker = async (args: string[]) => {
  const result = await runCommand("docker", args).catch((error: unknown) => {
    throw new Error(
      "Docker is required for Prostgles temporary databases. Install Docker and ensure its daemon is running.",
      { cause: error },
    );
  });
  return result;
};

const getDockerError = (args: string[], result: CommandResult) =>
  new Error(
    `docker ${args[0] ?? "command"} failed with exit code ${result.exitCode}: ${result.stderr.trim() || result.stdout.trim()}`,
  );

const validatePrefix = (configId: string) =>
  configId
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 20);

const getDatabaseUrl = (
  port: number,
  username: string,
  password: string,
  databaseName: string,
) => {
  const url = new URL("postgresql://127.0.0.1");
  url.username = username;
  url.password = password;
  url.port = String(port);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const delay = async (milliseconds: number) =>
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
const removeContainer = async (containerName: string) => {
  const args = ["rm", "--force", containerName];
  const result = await runDocker(args);
  if (result.exitCode !== 0 && !result.stderr.includes("No such container")) {
    throw getDockerError(args, result);
  }
};
