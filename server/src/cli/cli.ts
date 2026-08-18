#!/usr/bin/env node

import { fixIndent } from "@common/utils";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { parse } from "dotenv";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  watch,
  writeFileSync,
} from "fs";
import path from "path";
import { compileSchemaConfigProject } from "../ConnectionManager/compileSchemaConfigProject";
import {
  cliTemplateFiles,
  generatedFolderName,
  srcFolderName,
  srcSubfolderNames,
  testsFolderName,
} from "./cliUtils";
import { ensureCliDatabases } from "./ensureCliDatabases";

const usage = `Usage:
  prostgles create <directory> [--skip-install]
  prostgles dev [--config <directory>]
  prostgles start [--config <directory>]`;

const getConfigPath = (args: string[]) => {
  const configIndex = args.indexOf("--config");
  if (configIndex === -1) return process.cwd();
  const configPath = args[configIndex + 1];
  if (!configPath) throw new Error("--config requires a directory");
  return path.resolve(configPath);
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

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

const createConfig = (targetPath: string, skipInstall: boolean) => {
  if (existsSync(targetPath) && readdirSync(targetPath).length) {
    throw new Error(`${targetPath} already exists and is not empty`);
  }
  mkdirSync(path.join(targetPath, "src"), { recursive: true });
  mkdirSync(path.join(targetPath, "generated"), { recursive: true });
  mkdirSync(path.join(targetPath, testsFolderName), { recursive: true });
  srcSubfolderNames.forEach((folderName) => {
    mkdirSync(path.join(targetPath, srcFolderName, folderName));
  });
  const packageName = path
    .basename(targetPath)
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
  const configId = packageName || "my-prostgles-app";

  writeFileSync(
    path.join(targetPath, "package.json"),
    JSON.stringify(
      {
        name: configId,
        ...cliTemplateFiles.package,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    path.join(targetPath, "tsconfig.json"),
    JSON.stringify(cliTemplateFiles.tsconfig, null, 2) + "\n",
  );
  writeFileSync(
    path.join(targetPath, "eslint.config.mjs"),
    cliTemplateFiles.eslintConfig,
  );
  writeFileSync(
    path.join(targetPath, generatedFolderName, "DBGeneratedSchema.ts"),
    cliTemplateFiles.DBGeneratedSchema,
  );
  writeFileSync(path.join(targetPath, "AGENTS.md"), cliTemplateFiles.agents);
  writeFileSync(
    path.join(targetPath, testsFolderName, "deployment.test.ts"),
    cliTemplateFiles.deploymentTest({ configId }),
  );
  writeFileSync(
    path.join(targetPath, srcFolderName, "index.ts"),
    fixIndent(`
      import { defineConfig } from "@prostgles/prostgles";
      import type { DBGeneratedSchema } from "../${generatedFolderName}/DBGeneratedSchema";

      const prostgles = defineConfig<DBGeneratedSchema>();

      export default prostgles({
        id: ${JSON.stringify(configId)},
        connection: {
          table_options: {},
        },
        tableConfig: {},
      });`),
  );
  writeFileSync(
    path.join(targetPath, ".env.example"),
    cliTemplateFiles.envExample({ configId }),
  );
  writeFileSync(
    path.join(targetPath, ".gitignore"),
    cliTemplateFiles.gitignore,
  );

  if (skipInstall) {
    console.log(
      `Created config project in ${targetPath}. Run npm install, copy .env.example to .env, configure both database URLs, then run npm run dev.`,
    );
    return;
  }

  installConfigDependencies(targetPath);
  console.log(
    `Created config project and installed dependencies in ${targetPath}. Copy .env.example to .env, configure both database URLs, then run npm run dev.`,
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

  const environment = { ...process.env, ...getConfigEnvironment(configPath) };
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
const serverDirectory = path.resolve(path.dirname(serverEntryPath), "../../..");

const runServer = (configPath: string, mode: "development" | "production") =>
  spawn(process.execPath, [serverEntryPath], {
    cwd: serverDirectory,
    stdio: "inherit",
    env: {
      ...getConfigEnvironment(configPath),
      ...process.env,
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

const run = async (configPath: string, isDev: boolean) => {
  const environment = validateEnvironmentSetup(configPath);
  mkdirSync(path.join(configPath, generatedFolderName), { recursive: true });
  await compileSchemaConfigProject(configPath);
  await ensureCliDatabases(environment);
  let server: ChildProcess | undefined;
  let restarting = false;
  const start = () => {
    server = runServer(configPath, isDev ? "development" : "production");
    server.once("exit", (code, signal) => {
      if (!restarting && (code || signal)) process.exit(code || 1);
    });
  };
  const stop = async () => {
    const currentServer = server;
    server = undefined;
    if (!currentServer || currentServer.killed) return;
    currentServer.kill("SIGTERM");
    await new Promise<void>((resolve) => currentServer.once("exit", resolve));
  };
  start();

  let closeWatchers = undefined as (() => void) | undefined;
  const cleanup = () => {
    closeWatchers?.();
    void stop();
  };
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  if (!isDev) return;
  let timer: NodeJS.Timeout | undefined;
  const rebuild = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        try {
          await compileSchemaConfigProject(configPath);
          restarting = true;
          await stop();
          restarting = false;
          start();
        } catch (error) {
          console.error(error);
        }
      })();
    }, 100);
  };

  closeWatchers = watchConfig(configPath, rebuild);
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === "create") {
    const target = args[0];
    if (!target || target.startsWith("-")) throw new Error(usage);
    createConfig(path.resolve(target), args.includes("--skip-install"));
    return;
  }
  if (command === "dev" || command === "start") {
    await run(getConfigPath(args), command === "dev");
    return;
  }
  throw new Error(usage);
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
