import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const getConfigEnvironment = (configPath: string) => {
  const environmentFile = path.join(configPath, ".env");
  return {
    ...(existsSync(environmentFile) ?
      parse(readFileSync(environmentFile))
    : {}),
    ...process.env,
  };
};
