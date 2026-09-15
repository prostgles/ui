import type { DBSClient } from "@src/index";
import { isTesting } from "@src/init/utils";
import { rmSync } from "fs";
import { join } from "path";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { runDockerForWebApp } from "./runDockerForWebApp";

export const buildWebApp = async (
  { connectionId, clean }: { connectionId: string; clean?: boolean },
  { dbo }: { dbo: DBSClient },
) => {
  const { web_app_directory } = await getTemplatedWebAppConnection(
    dbo,
    connectionId,
  );
  if (clean) {
    for (const dir of ["e2e", "client"]) {
      const dirToClean = join(web_app_directory, dir);
      rmSync(`${dirToClean}/node_modules`, {
        recursive: true,
        force: true,
      });
      rmSync(`${dirToClean}/package-lock.json`);
    }
  }

  const result = await runDockerForWebApp({
    web_app_directory,
    image: "node:24-trixie-slim",
    shCommand: `cd client && npm i ${isTesting ? "" : "--silent"} && npm run build`,
    env: {
      HOME: "/tmp",
      NPM_CONFIG_CACHE: "/tmp/.npm_cache",
    },
  });

  return result;
};
