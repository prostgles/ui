import { expect, test } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

type RunOptions = {
  capture?: boolean;
  cwd?: string;
};

test("runs a generated config project with temporary databases and Docker Compose", async () => {
  test.setTimeout(900_000);

  const serverRoot = resolve(__dirname, "../../server");
  const testRoot = test.info().outputPath("project");
  mkdirSync(testRoot, { recursive: true });
  writeFileSync(
    join(testRoot, "package.json"),
    JSON.stringify({ private: true }),
  );
  const configId = `compose-${Date.now()}`;
  const appRoot = join(testRoot, configId);
  const packageArchive = join(testRoot, "prostgles.tgz");
  const serviceContainer = `${configId}-service-my-service`;
  const freePort = await new Promise<number>((resolvePromise, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a Compose test port."));
        return;
      }
      server.close((error) =>
        error ? reject(error) : resolvePromise(address.port),
      );
    });
  });
  const environment = {
    ...process.env,
    PROSTGLES_DOCKER_PORT: String(freePort),
  };
  const run = (command: string, args: string[], options: RunOptions = {}) =>
    new Promise<{ stderr: string; stdout: string }>(
      (resolvePromise, reject) => {
        const child = spawn(command, args, {
          cwd: options.cwd ?? appRoot,
          env: environment,
          stdio: options.capture ? "pipe" : "inherit",
        });
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.once("error", reject);
        child.once("close", (exitCode) => {
          if (exitCode === 0) {
            resolvePromise({ stderr, stdout });
          } else {
            reject(
              new Error(
                `${command} ${args.join(" ")} failed (${exitCode})\n${stderr}${stdout}`,
              ),
            );
          }
        });
      },
    );
  const waitFor = async (
    check: () => Promise<boolean>,
    label: string,
    timeout = 120_000,
  ) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await check()) return;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
    throw new Error(`Timed out waiting for ${label}`);
  };

  let composeStarted = false;
  try {
    await run(
      process.execPath,
      [join(serverRoot, "scripts", "preparePackage.mjs")],
      { cwd: serverRoot },
    );
    await run(
      "npm",
      ["pack", "--ignore-scripts", "--pack-destination", testRoot],
      { capture: true, cwd: serverRoot },
    );
    const packedFileName = readdirSync(testRoot).find((fileName) =>
      fileName.endsWith(".tgz"),
    );
    if (!packedFileName) throw new Error("npm pack did not create an archive.");
    copyFileSync(join(testRoot, packedFileName), packageArchive);

    await run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        packageArchive,
      ],
      { cwd: testRoot, capture: true },
    );
    await run(
      process.execPath,
      [
        join(
          testRoot,
          "node_modules/@prostgles/app/dist/server/src/cli/cli.js",
        ),
        "create",
        appRoot,
        "--skip-install",
      ],
      { cwd: testRoot },
    );
    copyFileSync(packageArchive, join(appRoot, "prostgles.tgz"));
    copyFileSync(join(appRoot, ".env.example"), join(appRoot, ".env"));
    const packageFile = join(appRoot, "package.json");
    const packageConfig = JSON.parse(readFileSync(packageFile, "utf8")) as {
      dependencies: Record<string, string>;
    };
    packageConfig.dependencies["@prostgles/app"] = "file:./prostgles.tgz";
    writeFileSync(packageFile, `${JSON.stringify(packageConfig, null, 2)}\n`);

    await run("npm", ["install", "--no-audit", "--no-fund"], { capture: true });
    await checkTemporaryDatabases(appRoot, configId, freePort);

    composeStarted = true;
    await run("docker", ["compose", "up", "--detach", "--build"]);
    await waitFor(
      async () =>
        await fetch(`http://127.0.0.1:${freePort}/dbs`)
          .then(async (response) => {
            const body = (await response.json()) as {
              initState?: { state?: string };
            };
            return body.initState?.state === "ok";
          })
          .catch(() => false),
      "the generated app",
    );

    const backupRestore = await run(
      "docker",
      [
        "compose",
        "exec",
        "--no-TTY",
        "app",
        "sh",
        "-ec",
        `
        for program in psql pg_dump pg_restore pg_dumpall; do
          which "$program"
          "$program" --version
        done
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE backup_restore_check (value text); INSERT INTO backup_restore_check VALUES ('backup-restored');"
        pg_dump "$PROSTGLES_DATABASE_URL" --format=c --table=backup_restore_check --file=/tmp/backup-check.dump
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
        pg_restore --dbname="$PROSTGLES_DATABASE_URL" --exit-on-error /tmp/backup-check.dump
        psql "$PROSTGLES_DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "SELECT value FROM backup_restore_check;"
        psql "$PROSTGLES_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE backup_restore_check;"
        rm /tmp/backup-check.dump
      `,
      ],
      { capture: true },
    );
    expect(backupRestore.stdout).toContain("backup-restored");

    const monitoring = await run(
      "docker",
      [
        "compose",
        "exec",
        "--no-TTY",
        "db",
        "sh",
        "-ec",
        `
        ps -eo pid,comm
        top -b -n 1
        psql -U postgres -d prostgles_state -At -v ON_ERROR_STOP=1 -c "SHOW shared_preload_libraries; SHOW max_connections; CREATE EXTENSION IF NOT EXISTS pg_stat_statements; SELECT count(*) FROM pg_stat_statements;"
      `,
      ],
      { capture: true },
    );
    expect(monitoring.stdout).toContain("pg_stat_statements");
    expect(monitoring.stdout.split("\n")).toContain("200");

    await run("docker", [
      "compose",
      "exec",
      "--no-TTY",
      "db",
      "psql",
      "-U",
      "postgres",
      "-d",
      "prostgles_state",
      "-c",
      "UPDATE services SET status = 'running' WHERE name = 'myService'",
    ]);
    await run("docker", ["compose", "restart", "app"]);
    await waitFor(
      async () =>
        await run("docker", ["inspect", serviceContainer], { capture: true })
          .then(() => true)
          .catch(() => false),
      "the generated myService container",
      180_000,
    );

    const callService = async () =>
      await run(
        "docker",
        [
          "compose",
          "exec",
          "--no-TTY",
          "app",
          "node",
          "-e",
          `fetch('http://${serviceContainer}:8080/hey').then(async response => { const text = await response.text(); if (text !== 'Hello from myService!') throw new Error(text); console.log(text); })`,
        ],
        { capture: true },
      );
    await waitFor(
      async () =>
        await callService()
          .then(() => true)
          .catch(() => false),
      "the generated myService endpoint",
    );
    const response = await callService();
    expect(response.stdout).toContain("Hello from myService!");
  } catch (error) {
    if (composeStarted) {
      await run("docker", ["compose", "logs", "--no-color"]).catch(
        () => undefined,
      );
    }
    throw error;
  } finally {
    await run("docker", ["rm", "--force", serviceContainer], {
      capture: true,
    }).catch(() => undefined);
    if (composeStarted) {
      await run("docker", [
        "compose",
        "down",
        "--volumes",
        "--rmi",
        "local",
        "--remove-orphans",
      ]).catch(() => undefined);
    }
    await run("docker", ["image", "rm", serviceContainer], {
      capture: true,
    }).catch(() => undefined);
    rmSync(testRoot, { force: true, recursive: true });
  }
});

const checkTemporaryDatabases = async (
  appRoot: string,
  configId: string,
  port: number,
) => {
  const { createTestDeployment } = createRequire(join(appRoot, "package.json"))(
    "@prostgles/app/testing",
  ) as typeof import("../../server/dist/server/src/cli/testing");
  const deployment = await createTestDeployment({
    configId,
    configPath: appRoot,
    logPath: test.info().outputPath("deployment.log"),
  });
  await deployment.dispose();
  expect(readFileSync(deployment.databaseLogPath, "utf8")).toContain(
    "database system is shut down",
  );

  const sourcePath = join(appRoot, "src/index.ts");
  const source = readFileSync(sourcePath, "utf8");
  const envPath = join(appRoot, ".env");
  const environment = readFileSync(envPath, "utf8");
  writeFileSync(
    envPath,
    "PROSTGLES_DATABASE_URL=invalid\nPROSTGLES_STATE_DATABASE_URL=invalid\n",
  );
  try {
    for (const mode of ["dev", "start"] as const) {
      const child = spawn("npm", ["run", mode, "--", "--temp-db"], {
        cwd: appRoot,
        detached: true,
        env: {
          ...process.env,
          PROSTGLES_UI_PORT: String(port),
          PROSTGLES_DATABASE_URL: "invalid",
          PROSTGLES_STATE_DATABASE_URL: "invalid",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let logs = "";
      const isReady = () => {
        if (child.exitCode !== null) throw new Error(logs.slice(-4000));
        return logs.includes("Server started");
      };
      child.stdout.on("data", (chunk) => {
        logs += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        logs += chunk.toString();
      });
      const exited = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      const containers = () => {
        const result = spawnSync(
          "docker",
          [
            "ps",
            "-aq",
            "--filter",
            `name=prostgles-test-${configId.slice(0, 20)}`,
          ],
          { encoding: "utf8" },
        );
        expect(result.status).toBe(0);
        return result.stdout.trim();
      };
      try {
        await expect.poll(isReady, { timeout: 90_000 }).toBe(true);
        const container = containers();
        expect(container).not.toBe("");
        if (mode === "dev") {
          logs = "";
          writeFileSync(
            sourcePath,
            `${source}\nconsole.log("TEMP_RELOADED");\n`,
          );
          await expect.poll(isReady, { timeout: 60_000 }).toBe(true);
          expect(logs).toContain("TEMP_RELOADED");
          expect(containers()).toBe(container);
        }
      } finally {
        if (child.pid && child.exitCode === null)
          process.kill(-child.pid, "SIGTERM");
        await exited;
        writeFileSync(test.info().outputPath(`${mode}.log`), logs);
        writeFileSync(sourcePath, source);
        await expect.poll(containers, { timeout: 30_000 }).toBe("");
      }
    }
    const logDirectory = join(appRoot, ".prostgles/test-logs");
    const databaseLogs = readdirSync(logDirectory).filter((name) =>
      name.endsWith(".postgres.log"),
    );
    expect(databaseLogs).toHaveLength(2);
    for (const name of databaseLogs) {
      copyFileSync(join(logDirectory, name), test.info().outputPath(name));
      expect(readFileSync(join(logDirectory, name), "utf8")).toContain(
        "database system is shut down",
      );
    }
  } finally {
    writeFileSync(envPath, environment);
  }
};
