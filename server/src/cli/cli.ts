#!/usr/bin/env node

import { fixIndent } from "@common/utils";
import { spawn, type ChildProcess } from "child_process";
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
import {
  cliTemplateFiles,
  generatedFolderName,
  srcFolderName,
} from "./cliUtils";

const usage = `Usage:
  prostgles create <directory>
  prostgles dev [--config <directory>]
  prostgles start [--config <directory>]`;

const getConfigPath = (args: string[]) => {
  const configIndex = args.indexOf("--config");
  if (configIndex === -1) return process.cwd();
  const configPath = args[configIndex + 1];
  if (!configPath) throw new Error("--config requires a directory");
  return path.resolve(configPath);
};

const getTscPath = (configPath: string) => {
  try {
    return require.resolve("typescript/bin/tsc", { paths: [configPath] });
  } catch {
    throw new Error(
      `TypeScript is not installed in ${configPath}. Run npm install in the config project.`,
    );
  }
};

const compileConfig = (configPath: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [getTscPath(configPath), "--project", configPath],
      { cwd: configPath, stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`Config compilation failed with exit code ${code}`));
    });
  });

const createConfig = (targetPath: string) => {
  if (existsSync(targetPath) && readdirSync(targetPath).length) {
    throw new Error(`${targetPath} already exists and is not empty`);
  }
  mkdirSync(path.join(targetPath, "src"), { recursive: true });
  mkdirSync(path.join(targetPath, "generated"), { recursive: true });
  const packageName = path
    .basename(targetPath)
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
  const configId = packageName || "my-prostgles-config";

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
    path.join(targetPath, generatedFolderName, "DBGeneratedSchema.ts"),
    cliTemplateFiles.DBGeneratedSchema,
  );
  writeFileSync(
    path.join(targetPath, srcFolderName, "index.ts"),
    fixIndent(`
      import { defineConfig } from "prostgles";
      import type { DBGeneratedSchema } from "../${generatedFolderName}/DBGeneratedSchema";

      export default defineConfig<DBGeneratedSchema>()({
        id: ${JSON.stringify(configId)},
        connection: {
          name: ${JSON.stringify(configId)},
          type: "Connection URI",
          db_conn: process.env.PROSTGLES_DATABASE_URL,
        },
        tableConfig: {},
      });`),
  );
  writeFileSync(
    path.join(targetPath, ".env.example"),
    cliTemplateFiles.envExample,
  );

  console.log(
    `Created config project in ${targetPath}. Copy .env.example to .env, configure both databases, run npm install, then npm run dev.`,
  );
};

const getConfigEnvironment = (configPath: string) => {
  const environmentFile = path.join(configPath, ".env");
  return existsSync(environmentFile) ?
      parse(readFileSync(environmentFile))
    : {};
};

const runServer = (configPath: string, mode: "development" | "production") =>
  spawn(process.execPath, [path.join(__dirname, "index.js")], {
    cwd: configPath,
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
  visit(path.join(configPath, "prostgles"));
  return () => watchers.forEach((watcher) => watcher.close());
};

const run = async (configPath: string, isDev: boolean) => {
  await compileConfig(configPath);
  let server: ChildProcess | undefined;
  let restarting = false;
  const start = () => {
    server = runServer(configPath, isDev ? "development" : "production");
    server.once("exit", (code, signal) => {
      if (!restarting && (code || signal)) process.exitCode = code || 1;
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

  if (!isDev) return;
  let timer: NodeJS.Timeout | undefined;
  const rebuild = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        try {
          await compileConfig(configPath);
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
  const closeWatchers = watchConfig(configPath, rebuild);
  const cleanup = () => {
    closeWatchers();
    void stop();
  };
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === "create") {
    const target = args[0];
    if (!target || target.startsWith("-")) throw new Error(usage);
    createConfig(path.resolve(target));
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
