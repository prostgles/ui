import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

/** Check existing ancestors too, so a symlink cannot put data in a package. */
export const assertPersistentDataPath = (dataPath: string) => {
  let existingPath = path.resolve(dataPath);
  while (!existsSync(existingPath)) {
    const parent = path.dirname(existingPath);
    if (parent === existingPath) break;
    existingPath = parent;
  }
  const paths = [path.resolve(dataPath), realpathSync(existingPath)];
  if (paths.some((value) =>
    value.toLowerCase().split(path.sep).includes("node_modules"),
  )) {
    throw new Error(
      `Unsafe Prostgles data path: ${dataPath}. Set PROSTGLES_DATA_DIR to a persistent directory outside node_modules; package upgrades and reinstalls delete package contents.`,
    );
  }
};
