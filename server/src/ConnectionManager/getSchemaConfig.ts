import { existsSync, statSync } from "fs";
import path from "path";
import type { DatabaseConfigs } from "..";
import { actualRootDir } from "../electronConfig";
import type { SchemaConfig } from "../schemaConfig";

const schemaConfigCache = new Map<
  string,
  { lastSynced: string | undefined; config: SchemaConfig }
>();

type ConfigSync = NonNullable<DatabaseConfigs["config_sync"]>;
type LoadedSchemaConfig = { config: SchemaConfig; configPath: string };

const getConfigPath = (config: NonNullable<ConfigSync>) => {
  const { configPath: configPathRaw, type } = config;
  const configPath = path.resolve(configPathRaw);
  const projectPath = path.resolve(process.cwd());
  const bundledSamplesPath = path.resolve(actualRootDir, "sample_schemas");
  const isBundledSample = configPath.startsWith(bundledSamplesPath + path.sep);

  if (type === "cli" && isBundledSample) {
    throw new Error(
      `config_sync.configPath is set to "${configPath}", which is a bundled sample schema. Please set it to a path outside the project.`,
    );
  }
  if (
    type === "cli" &&
    (configPath === projectPath ||
      configPath.startsWith(projectPath + path.sep))
  ) {
    throw new Error(
      `config_sync.configPath is set to "${configPathRaw}", which is inside the current project. Please set it to a path outside the project.`,
    );
  }
  if (!existsSync(configPath) || !statSync(configPath).isDirectory()) {
    throw new Error(
      `config_sync.configPath must be a Node.js project folder. "${configPathRaw}" is not a directory.`,
    );
  }
  if (!existsSync(path.join(configPath, "package.json"))) {
    throw new Error(
      `config_sync.configPath must contain a package.json. "${configPathRaw}" is not a Node.js project.`,
    );
  }
  return configPath;
};
type SchemaConfigResult<T extends ConfigSync | undefined | null> =
  T extends ConfigSync ? LoadedSchemaConfig : undefined;
export const getSchemaConfig = <T extends ConfigSync | undefined | null>(
  config_sync: T,
): SchemaConfigResult<T> => {
  if (!config_sync) return undefined as SchemaConfigResult<T>;
  const configPath = getConfigPath(config_sync);

  const lastSynced = config_sync.lastSynced;
  const cached = schemaConfigCache.get(configPath);
  if (cached && cached.lastSynced === lastSynced) {
    return { config: cached.config, configPath } as SchemaConfigResult<T>;
  }

  /** Reload the project and its local dependencies whenever the user syncs it. */
  const projectPrefix = configPath + path.sep;
  Object.keys(require.cache).forEach((modulePath) => {
    if (modulePath === configPath || modulePath.startsWith(projectPrefix)) {
      delete require.cache[modulePath];
    }
  });
  const entryPoint = require.resolve(configPath);
  const exports = require(entryPoint) as
    | SchemaConfig
    | { default?: SchemaConfig };
  const config =
    (exports as { default?: SchemaConfig }).default ??
    (exports as SchemaConfig);
  schemaConfigCache.set(configPath, { lastSynced, config });
  return { config, configPath } as SchemaConfigResult<T>;
};
