import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const serverDirectory = resolve(__dirname, "../../server");
const cliPath = join(serverDirectory, "dist/server/src/cli.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const run = (command: string, args: string[], cwd: string) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with status ${result.status}`,
        result.stdout?.toString() ?? "",
        result.stderr?.toString() ?? "",
      ].join("\n"),
    );
  }

  return result.stdout?.toString() ?? "";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getPackedPaths = (output: string) => {
  const result: unknown = JSON.parse(output);
  if (!Array.isArray(result)) {
    throw new Error("npm pack did not return an array");
  }

  const packageInfo = result.at(0);
  if (!isRecord(packageInfo) || !Array.isArray(packageInfo.files)) {
    throw new Error("npm pack output does not contain package files");
  }

  return packageInfo.files.map((file) => {
    if (!isRecord(file) || typeof file.path !== "string") {
      throw new Error("npm pack output contains an invalid file entry");
    }
    return file.path;
  });
};

test.describe("Published config CLI", () => {
  test.setTimeout(30_000);

  test("creates a config project that compiles against the public package API", () => {
    expect(existsSync(cliPath)).toBe(true);

    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), "prostgles-config-e2e-"),
    );
    const configDirectory = join(temporaryDirectory, "config");

    try {
      run(
        process.execPath,
        [cliPath, "create", configDirectory],
        serverDirectory,
      );

      expect(existsSync(join(configDirectory, "package.json"))).toBe(true);
      expect(existsSync(join(configDirectory, "tsconfig.json"))).toBe(true);
      expect(existsSync(join(configDirectory, ".env.example"))).toBe(true);
      expect(existsSync(join(configDirectory, "prostgles", "index.ts"))).toBe(
        true,
      );
      expect(
        existsSync(join(configDirectory, "prostgles", "DBGeneratedSchema.ts")),
      ).toBe(true);

      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"dev": "prostgles dev --config ."`);
      expect(
        readFileSync(join(configDirectory, "package.json"), "utf8"),
      ).toContain(`"start": "prostgles start --config ."`);
      expect(
        readFileSync(join(configDirectory, "prostgles", "index.ts"), "utf8"),
      ).toContain(`import { defineConfig } from "prostgles";`);

      const nodeModules = join(configDirectory, "node_modules");
      mkdirSync(nodeModules, { recursive: true });
      symlinkSync(serverDirectory, join(nodeModules, "prostgles"), "dir");
      symlinkSync(
        join(serverDirectory, "node_modules", "typescript"),
        join(nodeModules, "typescript"),
        "dir",
      );

      run(
        process.execPath,
        [
          join(nodeModules, "typescript", "bin", "tsc"),
          "--project",
          configDirectory,
        ],
        configDirectory,
      );

      expect(existsSync(join(configDirectory, "build", "index.js"))).toBe(true);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("never includes runtime data in the npm package", () => {
    const runtimeDirectories = [
      "prostgles_media",
      "prostgles_storage",
      "prostgles_backups",
      "prostgles_certificates",
    ];

    const sentinels = runtimeDirectories.map((directory) => {
      const absoluteDirectory = join(serverDirectory, directory);
      const existed = existsSync(absoluteDirectory);
      mkdirSync(absoluteDirectory, { recursive: true });

      const sentinel = join(
        absoluteDirectory,
        `e2e-npm-pack-sentinel-${process.pid}.txt`,
      );
      writeFileSync(sentinel, "must not be published\n");

      return { absoluteDirectory, directory, existed, sentinel };
    });

    try {
      const packedPaths = getPackedPaths(
        run(
          npmCommand,
          ["pack", "--dry-run", "--json", "--ignore-scripts"],
          serverDirectory,
        ),
      );

      expect(packedPaths).toContain("dist/server/src/cli.js");
      expect(packedPaths).toContain("dist/server/src/schemaConfig.js");
      expect(packedPaths).toContain("dist/server/src/schemaConfig.d.ts");

      for (const { directory, sentinel } of sentinels) {
        expect(packedPaths).not.toContain(
          `${directory}/${sentinel.split("/").at(-1)}`,
        );
        expect(
          packedPaths.some(
            (packedPath) =>
              packedPath === directory ||
              packedPath.startsWith(`${directory}/`),
          ),
        ).toBe(false);
      }
    } finally {
      for (const { absoluteDirectory, existed, sentinel } of sentinels) {
        rmSync(sentinel, { force: true });

        if (!existed && readdirSync(absoluteDirectory).length === 0) {
          rmdirSync(absoluteDirectory);
        }
      }
    }
  });
});
