import type { DBS } from "@src/index";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { rmSync } from "fs";
import { join } from "path";
import { runDockerForWebApp } from "./runDockerForWebApp";

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
    image: "node:20-slim",
    shCommand: "cd client && npm install --silent && npm run build",
  });

  // let testResult:
  //   | { stdout: string; stderr: string; exitCode: number }
  //   | undefined;
  // if (test) {
  //   const testDir = join(web_app_directory, "e2e");
  //   const res = spawnSync("npm", ["test"], {
  //     cwd: testDir,
  //     stdio: "inherit",
  //     shell: true,
  //   });
  //   const stdOut = res.stdout.toString() || "";
  //   const stdErr = res.stderr.toString() || "";
  //   testResult = {
  //     stdout: stdOut,
  //     stderr: stdErr,
  //     exitCode: res.status ?? -1,
  //   };
  // }

  return result;
};
