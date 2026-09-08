import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, open, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import prostgles, {
  type ClientFunctionHandler,
  type OnReadyParams,
} from "prostgles-client";
import type { UserLike } from "prostgles-types";
import { Client } from "pg";

const TEST_DATABASE_NAMESPACE = "prostgles_test_";
const DEFAULT_POSTGRES_IMAGE = "postgis/postgis:17-3.4";
const STATE_SOCKET_PATH = "/ws-api-dbs";
const START_TIMEOUT_MS = 60_000;

export type TestDeploymentUser = {
  /** Stable name used by connectStateAs/connectProjectAs. */
  key: string;
  username?: string;
  type?: "admin" | "default" | "public";
};

export type TestDeploymentSeedContext = {
  stateDatabase: Client;
  projectDatabase: Client;
};

export type CreateTestDeploymentOptions = {
  /** Root of the app created by `prostgles create`. Defaults to the current working directory. */
  configPath?: string;
  /** App ID used in Docker and database names. */
  configId: string;
  /** Explicit PostgreSQL image override. By default DB.Dockerfile is built when present. */
  postgresImage?: string;
  /** Output file for deployment stdout and stderr. */
  logPath?: string;
  users?: TestDeploymentUser[];
  seed?: (context: TestDeploymentSeedContext) => void | Promise<void>;
  startupTimeoutMs?: number;
};

export type TestDeploymentClient<
  Schema = void,
  Functions extends ClientFunctionHandler = ClientFunctionHandler,
  User extends UserLike = UserLike,
> = OnReadyParams<Schema, Functions, User> & {
  disconnect: () => void;
};

export type TestDeployment<
  Schema = void,
  Functions extends ClientFunctionHandler = ClientFunctionHandler,
  User extends UserLike = UserLike,
> = {
  endpoint: string;
  stateDatabaseName: string;
  projectDatabaseName: string;
  /** File containing deployment stdout and stderr. */
  logPath: string;
  connectStateAs: (
    userKey: string,
  ) => Promise<TestDeploymentClient<void, ClientFunctionHandler, UserLike>>;
  connectProjectAs: (
    userKey: string,
  ) => Promise<TestDeploymentClient<Schema, Functions, User>>;
  dispose: () => Promise<void>;
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
      "Docker is required for Prostgles deployment tests. Install Docker and ensure its daemon is running.",
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

const startDockerDatabases = async ({
  configPath,
  configId,
  postgresImage,
  startupTimeoutMs,
}: {
  configPath: string;
  configId: string;
  postgresImage?: string;
  startupTimeoutMs?: number;
}) => {
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
    "--rm",
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

  const dispose = async () => {
    const args = ["rm", "--force", containerName];
    const result = await runDocker(args);
    if (result.exitCode !== 0 && !result.stderr.includes("No such container")) {
      throw getDockerError(args, result);
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
    throw error;
  }
};

const getFreePort = async () =>
  await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a test port."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });

const stopProcess = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", resolve));
  if (process.platform === "win32" || !child.pid) child.kill("SIGTERM");
  else process.kill(-child.pid, "SIGTERM");
  const didExit = await Promise.race([
    exited.then(() => true),
    delay(5_000).then(() => false),
  ]);
  if (didExit) return;
  if (process.platform === "win32" || !child.pid) child.kill("SIGKILL");
  else process.kill(-child.pid, "SIGKILL");
  await exited;
};

const waitForReady = async ({
  child,
  endpoint,
  getLogs,
  logPath,
  timeoutMs,
}: {
  child: ChildProcess;
  endpoint: string;
  getLogs: () => Promise<string>;
  logPath: string;
  timeoutMs: number;
}) => {
  const getLogDetails = async () => `Log file: ${logPath}\n${await getLogs()}`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(
        `Prostgles test deployment exited with code ${child.exitCode}.\n${await getLogDetails()}`,
      );
    }
    const state = (await fetch(`${endpoint}/dbs`)
      .then(async (response) => await response.json())
      .catch(() => undefined)) as
      | { initState?: { state?: string; error?: unknown } }
      | undefined;
    if (state?.initState?.state === "ok") return;
    if (state?.initState?.state === "error") {
      throw new Error(
        `Prostgles test deployment failed to start: ${JSON.stringify(state.initState.error)}\n${await getLogDetails()}`,
      );
    }
    await delay(200);
  }
  throw new Error(
    `Timed out waiting for Prostgles test deployment.\n${await getLogDetails()}`,
  );
};

const seedUsers = async (databaseUrl: string, users: TestDeploymentUser[]) => {
  const client = new Client({ connectionString: databaseUrl });
  const tokens = new Map<string, string>();
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const userConfig of users) {
      if (tokens.has(userConfig.key)) {
        throw new Error(`Duplicate test user key: ${userConfig.key}`);
      }
      const id = randomUUID();
      const token = randomBytes(48).toString("hex");
      const userType = userConfig.type ?? "default";
      await client.query(
        `INSERT INTO users (id, username, password, type, status, passwordless_admin, last_updated)
         VALUES ($1, $2, '', $3, 'active', false, $4)`,
        [id, userConfig.username ?? userConfig.key, userType, Date.now()],
      );
      await client.query(
        `INSERT INTO sessions
          (id, user_id, user_type, expires, ip_address, type, user_agent)
         VALUES ($1, $2, $3, $4, '127.0.0.1', 'web', 'prostgles-test')`,
        [token, id, userType, Date.now() + 60 * 60 * 1000],
      );
      tokens.set(userConfig.key, token);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
  return tokens;
};

export const createTestDeployment = async <
  Schema = void,
  Functions extends ClientFunctionHandler = ClientFunctionHandler,
  User extends UserLike = UserLike,
>({
  configPath,
  configId,
  logPath,
  postgresImage,
  seed,
  startupTimeoutMs = START_TIMEOUT_MS,
  users = [{ key: "admin", type: "admin" }],
}: CreateTestDeploymentOptions): Promise<
  TestDeployment<Schema, Functions, User>
> => {
  const resolvedConfigPath = path.resolve(configPath ?? process.cwd());
  const databases = await startDockerDatabases({
    configPath: resolvedConfigPath,
    configId,
    postgresImage,
    startupTimeoutMs,
  });
  const port = await getFreePort().catch(async (error: unknown) => {
    await databases.dispose();
    throw error;
  });
  const endpoint = `http://127.0.0.1:${port}`;
  const cliPath = path.resolve(__dirname, "../cli.js");
  const resolvedLogPath = path.resolve(
    logPath ??
      path.join(
        resolvedConfigPath,
        ".prostgles/test-logs",
        `${Date.now()}-${randomBytes(4).toString("hex")}.log`,
      ),
  );
  const logFile = await mkdir(path.dirname(resolvedLogPath), {
    recursive: true,
  })
    .then(async () => await open(resolvedLogPath, "w"))
    .catch(async (error: unknown) => {
      await databases.dispose();
      throw error;
    });
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    PRGL_PASSWORD: randomBytes(32).toString("base64url"),
    PRGL_USERNAME: `prostgles_test_bootstrap_${randomBytes(4).toString("hex")}`,
    PROSTGLES_DATABASE_URL: databases.project.url,
    PROSTGLES_STATE_DATABASE_URL: databases.state.url,
    PROSTGLES_UI_HOST: "127.0.0.1",
    PROSTGLES_UI_PORT: String(port),
  };
  delete environment.PRGL_TEST;
  delete environment.PRGL_TEST_LOG_PATH;

  const child = spawn(
    process.execPath,
    [cliPath, "start", "--config", resolvedConfigPath],
    {
      cwd: resolvedConfigPath,
      detached: process.platform !== "win32",
      env: environment,
      stdio: ["ignore", logFile.fd, logFile.fd],
    },
  );
  await logFile.close();
  const getLogs = async () =>
    (await readFile(resolvedLogPath, "utf8")).slice(-20_000);
  const addLogPath = (error: unknown) => {
    const details = `Log file: ${resolvedLogPath}`;
    if (error instanceof Error && error.message.includes(details)) return error;
    return new Error(
      `${error instanceof Error ? error.message : "Test deployment failed."}\n${details}`,
      { cause: error },
    );
  };
  const clients = new Set<{ disconnect: () => void }>();
  let disposed = false;

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    for (const client of clients) client.disconnect();
    clients.clear();
    const processCleanup = await Promise.allSettled([stopProcess(child)]);
    const databaseCleanup = await Promise.allSettled([databases.dispose()]);
    const cleanupResults = [...processCleanup, ...databaseCleanup];
    const errors = cleanupResults
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason as unknown);
    if (errors.length) throw new AggregateError(errors, "Test cleanup failed.");
  };

  try {
    await waitForReady({
      child,
      endpoint,
      getLogs,
      logPath: resolvedLogPath,
      timeoutMs: startupTimeoutMs,
    });
    const tokens = await seedUsers(databases.state.url, users);

    if (seed) {
      const stateDatabase = new Client({
        connectionString: databases.state.url,
      });
      const projectDatabase = new Client({
        connectionString: databases.project.url,
      });
      await Promise.all([stateDatabase.connect(), projectDatabase.connect()]);
      try {
        await seed({ stateDatabase, projectDatabase });
      } finally {
        await Promise.all([stateDatabase.end(), projectDatabase.end()]);
      }
    }

    const connectionResult = new Client({
      connectionString: databases.state.url,
    });
    await connectionResult.connect();
    const connectionIdResult = await connectionResult.query<{ id: string }>(
      "SELECT id FROM connections WHERE db_name = $1",
      [databases.project.name],
    );
    await connectionResult.end();
    const connectionId = connectionIdResult.rows[0]?.id;
    if (!connectionId) {
      throw new Error("The CLI did not create its configured connection.");
    }

    const getToken = (userKey: string) => {
      const token = tokens.get(userKey);
      if (!token) throw new Error(`Unknown test user: ${userKey}`);
      return token;
    };
    const trackClient = <
      ClientSchema,
      ClientFunctions extends ClientFunctionHandler,
      ClientUser extends UserLike,
    >(
      client: OnReadyParams<ClientSchema, ClientFunctions, ClientUser>,
    ): TestDeploymentClient<ClientSchema, ClientFunctions, ClientUser> => {
      const disconnect = () => {
        client.socket.disconnect();
        clients.delete(trackedClient);
      };
      const trackedClient = Object.assign(client, { disconnect });
      clients.add(trackedClient);
      return trackedClient;
    };
    const connectStateAs = async (userKey: string) =>
      trackClient(
        await prostgles({
          endpoint,
          token: getToken(userKey),
          socketOptions: {
            path: STATE_SOCKET_PATH,
            transports: ["websocket"],
            reconnection: false,
            timeout: 10_000,
          },
        }),
      );
    const connectProjectAs = async (userKey: string) => {
      const stateClient = await connectStateAs(userKey);
      try {
        const startConnection = (
          stateClient.methods as
            | {
                startConnection?: (args: {
                  connectionId: string;
                }) => Promise<
                  { socketPath: string; socketUrl?: string } | undefined
                >;
              }
            | undefined
        )?.startConnection;
        if (!startConnection) {
          throw new Error("startConnection is not available to the test user.");
        }
        const socketInfo = await startConnection({ connectionId });
        if (!socketInfo?.socketPath) {
          throw new Error("The project socket path was not returned.");
        }
        return trackClient(
          await prostgles<Schema, Functions, User>({
            endpoint: socketInfo.socketUrl ?? endpoint,
            token: getToken(userKey),
            socketOptions: {
              path: socketInfo.socketPath,
              transports: ["websocket"],
              reconnection: false,
              timeout: 10_000,
            },
          }),
        );
      } finally {
        stateClient.disconnect();
      }
    };

    return {
      connectProjectAs,
      connectStateAs,
      dispose,
      endpoint,
      logPath: resolvedLogPath,
      projectDatabaseName: databases.project.name,
      stateDatabaseName: databases.state.name,
    };
  } catch (error) {
    try {
      await dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [addLogPath(error), cleanupError],
        `Test deployment failed and cleanup also failed.\nLog file: ${resolvedLogPath}`,
      );
    }
    throw addLogPath(error);
  }
};
