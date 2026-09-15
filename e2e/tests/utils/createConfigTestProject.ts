import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { SchemaConfig } from "../../../server/dist/server/src/schemaConfig";

export const createConfigTestProject = (config: SchemaConfig) => {
  const configPath = mkdtempSync(join(tmpdir(), "prostgles-config-e2e-"));
  symlinkSync(
    resolve(__dirname, "../../../server/node_modules"),
    join(configPath, "node_modules"),
    "dir",
  );
  writeFileSync(
    join(configPath, "package.json"),
    JSON.stringify({ name: config.id, main: "build/index.js" }),
  );
  writeFileSync(
    join(configPath, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { allowJs: true, outDir: "build", types: [] },
      include: ["index.js"],
    }),
  );
  writeFileSync(
    join(configPath, "index.js"),
    `module.exports = ${JSON.stringify(config)};`,
  );
  return configPath;
};
