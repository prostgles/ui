#!/usr/bin/env node

import { cliFileNames } from "./cliFileNames";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { randomBytes } from "node:crypto";
import { startTemporaryDatabases } from "./startTemporaryDatabases";
import { parse } from "dotenv";
import { existsSync, mkdirSync, readdirSync, readFileSync, watch } from "fs";
import path from "path";
import { compileSchemaConfigProject } from "../ConnectionManager/compileSchemaConfigProject";
import {
  generatedFolderName,
  saveCliComposeFiles,
  saveCliTemplateFiles,
  srcFolderName,
} from "./cliTemplateFiles";
import { ensureCliDatabases } from "./ensureCliDatabases";
import { upgradeCli } from "./upgradeCli";

const usage = `Usage:
  prostgles create <directory> [--skip-install]
  prostgles upgrade [--config <directory>]
  prostgles compose init [--config <directory>]
  prostgles dev [--config <directory>] [--temp-db]
  prostgles start [--config <directory>] [--temp-db]`;

const getConfigPath = (args: string[]) => {
  const configIndex = args.indexOf("--config");
  if (configIndex === -1) return process.cwd();
  const configPath = args[configIndex + 1];
  if (!configPath) throw new Error("--config requires a directory");
  return path.resolve(configPath);
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const getConfigId = (value: string) =>
  value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-prostgles-app";

const installConfigDependencies = (targetPath: string) => {
  const result = spawnSync(npmCommand, ["install"], {
    cwd: targetPath,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm install failed with status ${result.status ?? 1}`);
  }
};

const createConfig = async (targetPath: string, skipInstall: boolean) => {
  if (existsSync(targetPath) && readdirSync(targetPath).length) {
    throw new Error(`${targetPath} already exists and is not empty`);
  }

  const configId = getConfigId(path.basename(targetPath));
  await saveCliTemplateFiles({ configId, targetPath });

  if (skipInstall) {
    console.log(
      `Created config project in ${targetPath}. Run npm install, copy .env.example to .env, then see README.md for development and Docker deployment commands.`,
    );
    return;
  }

  installConfigDependencies(targetPath);
  console.log(
    `Created config project and installed dependencies in ${targetPath}. Copy .env.example to .env, then see README.md for development and Docker deployment commands.`,
  );
};

const getExistingConfigId = (configPath: string) => {
  const packageFile = path.join(configPath, cliFileNames.packageJson);
  if (!existsSync(packageFile)) {
    throw new Error(`No package.json found in config project ${configPath}`);
  }
  const packageConfig = JSON.parse(readFileSync(packageFile, "utf8")) as {
    name?: unknown;
  };
  return getConfigId(
    typeof packageConfig.name === "string" ?
      packageConfig.name
    : path.basename(configPath),
  );
};

const initialiseCompose = async (configPath: string) => {
  const configId = getExistingConfigId(configPath);
  await saveCliComposeFiles({ configId, targetPath: configPath });
  console.log(
    `Added Dockerfile, compose.yaml and .dockerignore to ${configPath}. Set PROSTGLES_DOCKER_DB_PASSWORD in .env, then run docker compose up -d --build.`,
  );
};

const getConfigEnvironment = (configPath: string) => {
  const environmentFile = path.join(configPath, ".env");
  return existsSync(environmentFile) ?
      parse(readFileSync(environmentFile))
    : {};
};

const validateEnvironmentSetup = (configPath: string) => {
  const environmentFile = path.join(configPath, ".env");
  if (!existsSync(environmentFile)) {
    console.warn(
      `Warning: No .env file found at ${environmentFile}. Copy .env.example to .env and configure both database URLs.`,
    );
  }

  const environment = { ...getConfigEnvironment(configPath), ...process.env };
  const hasValue = (value: string | undefined) => Boolean(value?.trim());
  if (!hasValue(environment.PROSTGLES_STATE_DATABASE_URL)) {
    throw new Error(
      "Prostgles UI state database credentials are missing. Set PROSTGLES_STATE_DATABASE_URL.",
    );
  }
  if (!hasValue(environment.PROSTGLES_DATABASE_URL)) {
    throw new Error(
      "Configured database credentials are missing. Set PROSTGLES_DATABASE_URL.",
    );
  }
  return environment as NodeJS.ProcessEnv & {
    PROSTGLES_STATE_DATABASE_URL: string;
    PROSTGLES_DATABASE_URL: string;
  };
};

const serverEntryPath = path.join(__dirname, "..", "cliServer.js");

const runServer = (
  configPath: string,
  mode: "development" | "production",
  environment: NodeJS.ProcessEnv,
) =>
  spawn(process.execPath, [serverEntryPath], {
    cwd: configPath,
    stdio: "inherit",
    env: {
      ...environment,
      NODE_ENV: mode,
      PROSTGLES_UI_CONFIG: configPath,
    },
  });

const watchConfig = (configPath: string, onChange: () => void) => {
  const watchers: ReturnType<typeof watch>[] = [];
  const visit = (directory: string) => {
    watchers.push(watch(directory, () => onChange()));
    readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
      .forEach((entry) => visit(path.join(directory, entry.name)));
  };
  visit(path.join(configPath, srcFolderName));
  return () => watchers.forEach((watcher) => watcher.close());
};

const run = async (configPath: string, isDev: boolean, temporary: boolean) => {
  const configuredEnvironment =
    temporary ? undefined : validateEnvironmentSetup(configPath);
  const environment = configuredEnvironment ?? {
    ...getConfigEnvironment(configPath),
    ...process.env,
  };
  mkdirSync(path.join(configPath, generatedFolderName), { recursive: true });
  await compileSchemaConfigProject(configPath);
  const shutdown = new AbortController();
  const onSignal = () => shutdown.abort();
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  const databases =
    temporary ?
      await startTemporaryDatabases({
        configPath,
        configId: getExistingConfigId(configPath),
        logPath: path.join(
          configPath,
          ".prostgles/test-logs",
          `${Date.now()}-${randomBytes(4).toString("hex")}.postgres.log`,
        ),
      })
    : undefined;
  if (databases) {
    environment.PROSTGLES_STATE_DATABASE_URL = databases.state.url;
    environment.PROSTGLES_DATABASE_URL = databases.project.url;
    environment.PROSTGLES_UI_HOST = "127.0.0.1";
    environment.PRGL_USERNAME ||= "admin";
    if (!environment.PRGL_PASSWORD) {
      environment.PRGL_PASSWORD = randomBytes(24).toString("base64url");
      console.log(
        `Temporary admin login: ${environment.PRGL_USERNAME} / ${environment.PRGL_PASSWORD}`,
      );
    }
    console.log(
      "Using temporary databases. Data is deleted when this command stops.",
    );
  } else if (configuredEnvironment) {
    await ensureCliDatabases(configuredEnvironment);
  }
  let server: ChildProcess | undefined;
  let restarting = false;
  let stopping = false;
  const isStopping = () => stopping;
  let timer: NodeJS.Timeout | undefined;
  let closeWatchers: (() => void) | undefined;
  const start = () => {
    server = runServer(
      configPath,
      isDev ? "development" : "production",
      environment,
    );
    server.once("error", (error) => {
      console.error(error);
      void cleanup(1);
    });
    server.once("exit", (code, signal) => {
      if (!restarting && !stopping) void cleanup(code ?? (signal ? 1 : 0));
    });
  };
  const stop = async () => {
    const currentServer = server;
    server = undefined;
    if (
      !currentServer ||
      currentServer.exitCode !== null ||
      currentServer.signalCode !== null ||
      !currentServer.pid
    )
      return;
    currentServer.kill("SIGTERM");
    await new Promise<void>((resolve) => currentServer.once("exit", resolve));
  };
  const cleanup = async (exitCode = 0) => {
    if (isStopping()) return;
    stopping = true;
    if (timer) clearTimeout(timer);
    closeWatchers?.();
    try {
      await stop();
    } finally {
      try {
        await databases?.dispose();
      } catch (error) {
        console.error(error);
        exitCode = 1;
      }
      process.exitCode = exitCode;
    }
  };
  shutdown.signal.addEventListener("abort", () => void cleanup(), {
    once: true,
  });
  if (shutdown.signal.aborted) {
    await cleanup();
    return;
  }
  start();

  if (!isDev) return;
  const rebuild = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        try {
          await compileSchemaConfigProject(configPath);
          if (isStopping()) return;
          restarting = true;
          await stop();
          restarting = false;
          if (!isStopping()) start();
        } catch (error) {
          console.error(error);
        }
      })();
    }, 100);
  };

  try {
    closeWatchers = watchConfig(configPath, rebuild);
  } catch (error) {
    await cleanup(1);
    throw error;
  }
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === "create") {
    const target = args[0];
    if (!target || target.startsWith("-")) throw new Error(usage);
    await createConfig(path.resolve(target), args.includes("--skip-install"));
    return;
  }
  if (command === "compose" && args[0] === "init") {
    await initialiseCompose(getConfigPath(args.slice(1)));
    return;
  }
  if (command === "upgrade") {
    const configPath = getConfigPath(args);
    await upgradeCli(getExistingConfigId(configPath), configPath);
    console.log("Upgrade file processing complete.");
    return;
  }
  if (command === "dev" || command === "start") {
    await run(
      getConfigPath(args),
      command === "dev",
      args.includes("--temp-db"),
    );
    return;
  }
  throw new Error(usage);
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
