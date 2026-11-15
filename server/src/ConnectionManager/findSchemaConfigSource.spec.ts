import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { findSchemaConfigSource } from "./findSchemaConfigSource";

void test("finds config entries through imports, spreads, and helper calls", (t) => {
  const projectPath = join(
    process.cwd(),
    "debug",
    `find-schema-config-source-${process.pid}`,
  );
  t.after(() => rmSync(projectPath, { recursive: true, force: true }));
  mkdirSync(join(projectPath, "src"), { recursive: true });
  writeFileSync(
    join(projectPath, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { module: "Node16", moduleResolution: "Node16" },
      include: ["src"],
    }),
  );
  writeFileSync(
    join(projectPath, "src", "tables.ts"),
    `export const tableConfig = {
  orders: {
    columns: { status: "TEXT" },
  },
};
export const tableHooks = {
  orders: {
    beforeEach: [],
  },
};
export const tableOptions = {
  orders: {
    label: "Orders",
  },
};
`,
  );
  writeFileSync(
    join(projectPath, "src", "functions.ts"),
    `const functionName = "archiveOrder";
const defineFunctions = (value: unknown) => value;
declare const defineFunction: (value: unknown) => unknown;
export const functions = defineFunctions({
  [functionName]: defineFunction({
    run: () => undefined,
  }),
});
`,
  );
  writeFileSync(
    join(projectPath, "src", "index.ts"),
    `import { functions } from "./functions";
import { tableConfig, tableHooks, tableOptions } from "./tables";
const prostgles = (value: unknown) => value;
const defineFunctionGroup = (value: unknown) => value;
export default prostgles({
  tableConfig: { ...tableConfig },
  tableHooks,
  connection: { table_options: { ...tableOptions } },
  functions: {
    public: defineFunctionGroup({ functions }),
  },
});
`,
  );

  assert.deepEqual(
    findSchemaConfigSource({
      projectPath,
      projectVersion: "1",
      type: "tableConfig",
      name: "orders",
    }),
    {
      fileName: join(projectPath, "src", "tables.ts"),
      startLineNumber: 2,
      endLineNumber: 4,
    },
  );
  assert.deepEqual(
    findSchemaConfigSource({
      projectPath,
      projectVersion: "1",
      type: "tableHooks",
      name: "orders",
    }),
    {
      fileName: join(projectPath, "src", "tables.ts"),
      startLineNumber: 7,
      endLineNumber: 9,
    },
  );
  assert.deepEqual(
    findSchemaConfigSource({
      projectPath,
      projectVersion: "1",
      type: "tableOptions",
      name: "orders",
    }),
    {
      fileName: join(projectPath, "src", "tables.ts"),
      startLineNumber: 12,
      endLineNumber: 14,
    },
  );
  assert.deepEqual(
    findSchemaConfigSource({
      projectPath,
      projectVersion: "1",
      type: "function",
      name: "archiveOrder",
    }),
    {
      fileName: join(projectPath, "src", "functions.ts"),
      startLineNumber: 5,
      endLineNumber: 7,
    },
  );
  assert.equal(
    findSchemaConfigSource({
      projectPath,
      projectVersion: "1",
      type: "tableHooks",
      name: "customers",
    }),
    undefined,
  );
});
