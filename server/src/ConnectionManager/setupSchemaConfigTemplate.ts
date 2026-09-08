import { execFile } from "child_process";
import { readdir } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { actualRootDir } from "../electronConfig";

export const setupSchemaConfigTemplate = async (configPath: string) => {
  const projectPath = path.resolve(actualRootDir);
  if (
    !path.isAbsolute(configPath) ||
    path.resolve(configPath) === projectPath ||
    path.resolve(configPath).startsWith(projectPath + path.sep)
  ) {
    throw new Error(
      "Select an absolute folder path outside the Prostgles project.",
    );
  }
  if ((await readdir(configPath)).length) {
    throw new Error("Template setup requires an empty folder.");
  }
  await promisify(execFile)(process.execPath, [
    path.join(__dirname, "../cli/cli.js"),
    "create",
    configPath,
  ]);
};
