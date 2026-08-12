import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { test } from "node:test";
import { tmpdir } from "os";
import { join } from "path";
import { getNodeTypes } from "./getNodeTypes";

void test("normalizes types from a file dependency and its hoisted dependencies", (t) => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "get-node-types-"));
  t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

  const projectDir = join(fixtureDir, "project");
  const dependencyDir = join(fixtureDir, "dependency");
  const hoistedDependencyDir = join(fixtureDir, "node_modules", "hoisted");
  mkdirSync(join(projectDir, "node_modules"), { recursive: true });
  mkdirSync(dependencyDir);
  mkdirSync(hoistedDependencyDir, { recursive: true });
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify({ dependencies: { example: "file:../dependency" } }),
  );
  writeFileSync(
    join(dependencyDir, "package.json"),
    JSON.stringify({ exports: { ".": { types: "./index.d.ts" } } }),
  );
  writeFileSync(
    join(dependencyDir, "index.d.ts"),
    'export type { Hoisted } from "hoisted";',
  );
  writeFileSync(
    join(hoistedDependencyDir, "package.json"),
    JSON.stringify({ types: "index.d.ts" }),
  );
  writeFileSync(
    join(hoistedDependencyDir, "index.d.ts"),
    "export type Hoisted = 1;",
  );
  symlinkSync(dependencyDir, join(projectDir, "node_modules", "example"));

  const paths = getNodeTypes(projectDir).map(({ filePath }) => filePath);
  if (!paths.includes("/node_modules/example/index.d.ts")) {
    throw new Error("File dependency types were not extracted");
  }
  if (!paths.includes("/node_modules/hoisted/index.d.ts")) {
    throw new Error("Hoisted dependency types were not normalized");
  }
  if (paths.some((filePath) => filePath.includes(".."))) {
    throw new Error("Extracted type paths must not escape the virtual project");
  }
});

void test("Ensure ts versions match to reduce bundle size", () => {
  const prostglesServerPkg = JSON.parse(
    readFileSync(
      join(__dirname, "../../../../node_modules/prostgles-server/package.json"),
      "utf-8",
    ),
  ) as { dependencies: Record<string, string> } | null;

  const prostglesServerTsVersion = prostglesServerPkg?.dependencies.typescript;

  if (prostglesServerPkg && !prostglesServerTsVersion) {
    return;
  }

  const uiTsVersion = JSON.parse(
    readFileSync(join(__dirname, "../../../../package.json"), "utf-8"),
  ).dependencies.typescript;
  if (!prostglesServerTsVersion || prostglesServerTsVersion !== uiTsVersion) {
    throw new Error(
      `TypeScript version mismatch: prostgles-server (${prostglesServerTsVersion}) vs ui (${uiTsVersion})`,
    );
  }
});
