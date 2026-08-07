#!/usr/bin/env node

import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readdirSync, watch, writeFileSync } from "fs";
import path from "path";
import packageJson from "../package.json";

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
  const packageName = path
    .basename(targetPath)
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
  const configId = packageName || "my-ui";

  writeFileSync(
    path.join(targetPath, "package.json"),
    JSON.stringify(
      {
        name: configId,
        private: true,
        version: "0.0.0",
        main: "build/index.js",
        scripts: {
          build: "tsc --project tsconfig.json",
          dev: "prostgles dev --config .",
          start: "prostgles start --config .",
        },
        dependencies: { prostgles: `^${packageJson.version}` },
        devDependencies: {
          "@types/node": "^22.20.1",
          typescript: "^5.9.3",
        },
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    path.join(targetPath, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "Node16",
          moduleResolution: "Node16",
          rootDir: "src",
          outDir: "build",
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
        },
        include: ["src"],
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    path.join(targetPath, "src", "DBGeneratedSchema.ts"),
    "export type DBGeneratedSchema = Record<string, { columns: Record<string, unknown> }>\n",
  );
  writeFileSync(
    path.join(targetPath, "src", "index.ts"),
    `import { defineConfig } from "prostgles-ui/schema-config";
import type { DBGeneratedSchema } from "./DBGeneratedSchema";

export default defineConfig<DBGeneratedSchema>()({
  id: ${JSON.stringify(configId)},
  connection: {
    name: ${JSON.stringify(configId)},
    type: "Connection URI",
    db_conn: process.env.PROSTGLES_DATABASE_URL,
  },
  tableConfig: {},
});
`,
  );
  console.log(
    `Created config project in ${targetPath}. Run npm install, then npm run dev.`,
  );
};

const runServer = (configPath: string, mode: "development" | "production") =>
  spawn(process.execPath, [path.join(__dirname, "index.js")], {
    cwd: configPath,
    stdio: "inherit",
    env: {
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
  visit(path.join(configPath, "src"));
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
