import { existsSync, statSync } from "fs";
import path from "path";
import { actualRootDir } from "../electronConfig";

export const getValidConfigPath = (
  dbConf: {
    config_sync?: { schemaPath?: string } | null;
  },
  { allowCurrentProject = false }: { allowCurrentProject?: boolean } = {},
) => {
  if (!dbConf.config_sync) return;
  const { schemaPath } = dbConf.config_sync;
  if (!schemaPath) {
    throw new Error(
      "config_sync.schemaPath is not set. Please set it to the path of your table config file.",
    );
  }

  const configPath = path.resolve(schemaPath);
  const projectPath = path.resolve(process.cwd());
  const bundledSamplesPath = path.resolve(actualRootDir, "sample_schemas");
  const isBundledSample =
    configPath.startsWith(bundledSamplesPath + path.sep);

  /** Do not allow schemaPath to be inside the current project */
  if (
    !allowCurrentProject &&
    !isBundledSample &&
    (configPath === projectPath || configPath.startsWith(projectPath + path.sep))
  ) {
    throw new Error(
      `config_sync.schemaPath is set to "${schemaPath}", which is inside the current project. Please set it to a path outside the project.`,
    );
  }

  if (!existsSync(configPath) || !statSync(configPath).isDirectory()) {
    throw new Error(
      `config_sync.schemaPath must be a Node.js project folder. "${schemaPath}" is not a directory.`,
    );
  }
  if (!existsSync(path.join(configPath, "package.json"))) {
    throw new Error(
      `config_sync.schemaPath must contain a package.json. "${schemaPath}" is not a Node.js project.`,
    );
  }

  return configPath;
};
