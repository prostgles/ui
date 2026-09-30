import { existsSync, statSync } from "fs";
import path from "path";
import type { DatabaseConfigs } from "..";
import { actualRootDir } from "../electronConfig";
import type { SchemaConfig } from "../schemaConfig";

const schemaConfigCache = new Map<
  string,
  { lastSynced: string | undefined; config: SchemaConfig }
>();

type ConfigSync = Omit<
  NonNullable<DatabaseConfigs["config_sync"]>,
  "toggleableProperties"
>;
type LoadedSchemaConfig = { config: SchemaConfig; configPath: string };

const validateConfigPath = (config: NonNullable<ConfigSync>) => {
  const { configPath, type } = config;
  if (configPath !== path.resolve(configPath)) {
    throw new Error(
      `config_sync.configPath must be an absolute path. "${configPath}" is not absolute.`,
    );
  }
  const projectPath = path.resolve(actualRootDir);
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
      `config_sync.configPath is set to "${configPath}", which is inside the current project. Please set it to a path outside the project.`,
    );
  }
  if (!existsSync(configPath) || !statSync(configPath).isDirectory()) {
    throw new Error(
      `config_sync.configPath must be a Node.js project folder. "${configPath}" is not a directory.`,
    );
  }
  if (!existsSync(path.join(configPath, "package.json"))) {
    throw new Error(
      `config_sync.configPath must contain a package.json. "${configPath}" is not a Node.js project.`,
    );
  }
};
type SchemaConfigResult<T extends ConfigSync | undefined | null> =
  T extends ConfigSync ? LoadedSchemaConfig : undefined;
export const getSchemaConfig = <T extends ConfigSync | undefined | null>(
  config_sync: T,
): SchemaConfigResult<T> => {
  if (!config_sync) return undefined as SchemaConfigResult<T>;
  validateConfigPath(config_sync);

  const { configPath, lastSynced } = config_sync;
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
