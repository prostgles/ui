import type { DatabaseConfigs } from "..";

export const getValidConfigPath = (
  dbConf: Pick<DatabaseConfigs, "config_sync">,
) => {
  if (!dbConf.config_sync) return;
  const { schemaPath } = dbConf.config_sync;
  if (!schemaPath) {
    throw new Error(
      "config_sync.schemaPath is not set. Please set it to the path of your table config file.",
    );
  }

  /** Do not allow schemaPath to be inside the current project */
  if (schemaPath.startsWith(process.cwd())) {
    throw new Error(
      `config_sync.schemaPath is set to "${schemaPath}", which is inside the current project. Please set it to a path outside the project.`,
    );
  }

  return schemaPath;
};
