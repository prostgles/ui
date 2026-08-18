import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
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
  /** Root of the app created by `prostgles create`. */
  configPath: string;
  /** Optional readable segment used in Docker and database names. */
  databasePrefix?: string;
  /** PostgreSQL Docker image. Defaults to the PostGIS image used by Prostgles. */
  postgresImage?: string;
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

const validatePrefix = (prefix: string) => {
  if (!prefix) return;
  if (prefix.length > 20) {
    throw new Error(
      "PROSTGLES_TEST_DATABASES_PREFIX must be at most 20 characters.",
    );
  }
  const isValidCharacter = (character: string) => {
    const lower = character.toLowerCase();
    return (
      (lower >= "a" && lower <= "z") ||
      (character >= "0" && character <= "9") ||
      character === "_"
    );
  };
  if (![...prefix].every(isValidCharacter)) {
    throw new Error(
      "PROSTGLES_TEST_DATABASES_PREFIX may contain only letters, numbers, and underscores.",
    );
  }
};

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
  databasePrefix,
  postgresImage,
  startupTimeoutMs,
}: Pick<
  CreateTestDeploymentOptions,
  "databasePrefix" | "postgresImage" | "startupTimeoutMs"
>) => {
  const prefix =
    databasePrefix ?? process.env.PROSTGLES_TEST_DATABASES_PREFIX ?? "";
  validatePrefix(prefix);
  const runId = randomBytes(6).toString("hex");
  const baseName = `${TEST_DATABASE_NAMESPACE}${prefix ? `${prefix}_` : ""}${runId}`;
  const stateName = `${baseName}_state`;
  const projectName = `${baseName}_project`;
  const username = "prostgles_test";
  const password = randomBytes(24).toString("base64url");
  const containerName = `prostgles-test-${prefix ? `${prefix.replaceAll("_", "-")}-` : ""}${runId}`;
  const image =
    postgresImage ??
    process.env.PROSTGLES_TEST_POSTGRES_IMAGE ??
    DEFAULT_POSTGRES_IMAGE;
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
    if (
      result.exitCode !== 0 &&
      !result.stderr.includes("No such container")
    ) {
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
      throw new Error(`Docker returned an invalid PostgreSQL port: ${portText}`);
    }

    const maintenanceUrl = getDatabaseUrl(
      port,
      username,
      password,
      "postgres",
    );
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
  timeoutMs,
}: {
  child: ChildProcess;
  endpoint: string;
  getLogs: () => string;
  timeoutMs: number;
}) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(
        `Prostgles test deployment exited with code ${child.exitCode}.\n${getLogs()}`,
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
        `Prostgles test deployment failed to start: ${JSON.stringify(state.initState.error)}\n${getLogs()}`,
      );
    }
    await delay(200);
  }
  throw new Error(
    `Timed out waiting for Prostgles test deployment.\n${getLogs()}`,
  );
};

const seedUsers = async (
  databaseUrl: string,
  users: TestDeploymentUser[],
) => {
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
  databasePrefix,
  postgresImage,
  seed,
  startupTimeoutMs = START_TIMEOUT_MS,
  users = [{ key: "admin", type: "admin" }],
}: CreateTestDeploymentOptions): Promise<
  TestDeployment<Schema, Functions, User>
> => {
  const resolvedConfigPath = path.resolve(configPath);
  const databases = await startDockerDatabases({
    databasePrefix,
    postgresImage,
    startupTimeoutMs,
  });
  const port = await getFreePort().catch(async (error: unknown) => {
    await databases.dispose();
    throw error;
  });
  const endpoint = `http://127.0.0.1:${port}`;
  const cliPath = path.resolve(__dirname, "../cli/cli.js");
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
      stdio: "pipe",
    },
  );
  let logs = "";
  const appendLogs = (chunk: Buffer | string) => {
    logs = (logs + chunk.toString()).slice(-20_000);
  };
  child.stdout.on("data", appendLogs);
  child.stderr.on("data", appendLogs);
  const clients = new Set<{ disconnect: () => void }>();
  let disposed = false;

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    for (const client of clients) client.disconnect();
    clients.clear();
    const cleanupResults = await Promise.allSettled([
      stopProcess(child),
      databases.dispose(),
    ]);
    const errors = cleanupResults
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason as unknown);
    if (errors.length) throw new AggregateError(errors, "Test cleanup failed.");
  };

  try {
    await waitForReady({
      child,
      endpoint,
      getLogs: () => logs,
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
                startConnection?: (args: { connectionId: string }) => Promise<
                  | { socketPath: string; socketUrl?: string }
                  | undefined
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
      projectDatabaseName: databases.project.name,
      stateDatabaseName: databases.state.name,
    };
  } catch (error) {
    try {
      await dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Test deployment failed and cleanup also failed.",
      );
    }
    throw error;
  }
};
