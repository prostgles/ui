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
import { deepStrictEqual, ok } from "node:assert/strict";
import ts from "typescript";
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

for (const dependencyLocation of ["hoisted", "nested"] as const) {
  void test(`extracts ${dependencyLocation} CLI dependencies with usable dbo types`, (t) => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "get-cli-node-types-"));
    t.after(() => rmSync(fixtureDir, { recursive: true, force: true }));

    const projectDir = join(fixtureDir, "node_modules", "@prostgles", "app");
    const dependencyRoot =
      dependencyLocation === "hoisted" ? fixtureDir : projectDir;
    const serverDir = join(dependencyRoot, "node_modules", "prostgles-server");
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(serverDir, { recursive: true });
    writeFileSync(
      join(projectDir, "package.json"),
      JSON.stringify({ dependencies: { "prostgles-server": "1.0.0" } }),
    );
    writeFileSync(
      join(serverDir, "package.json"),
      JSON.stringify({ exports: { ".": { types: "./index.d.ts" } } }),
    );
    writeFileSync(
      join(serverDir, "index.d.ts"),
      'export type { DBOFullyTyped } from "./dbo";',
    );
    writeFileSync(
      join(serverDir, "dbo.d.ts"),
      `export type DBOFullyTyped<Schema> = {
        [TableName in keyof Schema]: {
          findOne(): Promise<Schema[TableName]>;
        };
      };`,
    );

    const files = new Map(
      getNodeTypes(projectDir).map(({ filePath, content }) => [
        filePath,
        content,
      ]),
    );
    for (const fileName of ["package.json", "index.d.ts", "dbo.d.ts"]) {
      ok(
        files.has(`/node_modules/prostgles-server/${fileName}`),
        `Missing virtual prostgles-server/${fileName}`,
      );
    }
    files.set(
      "/method.ts",
      `type DBGeneratedSchema = { example: { name: string } };
      type ProstglesMethod = (
        args: never,
        ctx: { dbo: import("prostgles-server").DBOFullyTyped<DBGeneratedSchema> }
      ) => Promise<void>;
      export const run: ProstglesMethod = async (args, { dbo }) => {
        const row = await dbo.example.findOne();
        type IsAny<T> = 0 extends (1 & T) ? true : false;
        const dboIsAny: IsAny<typeof dbo> = false;
        const nameIsAny: IsAny<typeof row.name> = false;
        const name: string = row.name;
      };`,
    );
    const compilerOptions: ts.CompilerOptions = {
      moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2020,
      types: [],
    };
    const compilerHost = ts.createCompilerHost(compilerOptions);
    compilerHost.directoryExists = undefined;
    compilerHost.fileExists = (fileName) =>
      files.has(fileName) || ts.sys.fileExists(fileName);
    compilerHost.readFile = (fileName) =>
      files.get(fileName) ?? ts.sys.readFile(fileName);
    compilerHost.getSourceFile = (fileName, languageVersion) => {
      const content = compilerHost.readFile(fileName);
      return content === undefined ? undefined : (
          ts.createSourceFile(fileName, content, languageVersion)
        );
    };
    const program = ts.createProgram(
      ["/method.ts"],
      compilerOptions,
      compilerHost,
    );
    deepStrictEqual(
      ts
        .getPreEmitDiagnostics(program)
        .map(({ messageText }) =>
          ts.flattenDiagnosticMessageText(messageText, "\n"),
        ),
      [],
    );
  });
}

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
