import type { DBS } from "@src/index";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { rmSync } from "fs";
import { join } from "path";
import { runDockerForWebApp } from "./runDockerForWebApp";
import { isTesting } from "@src/init/utils";

export const buildWebApp = async (
  { connectionId, clean }: { connectionId: string; clean?: boolean },
  { dbo }: { dbo: DBS },
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
    image: "node:24-slim",
    shCommand: `cd client && npm install ${isTesting ? "" : "--silent"} && npm run build`,
  });

  return result;
};
