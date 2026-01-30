import type { DBS } from "@src/index";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { runDockerForWebApp } from "./runDockerForWebApp";

export const testWebApp = async (
  { connectionId }: { connectionId: string },
  { dbo }: { dbo: DBS },
) => {
  const { web_app_directory, port } = await getTemplatedWebAppConnection(
    dbo,
    connectionId,
  );

  if (!port) {
    throw "Web app port not set for connection";
  }

  const result = await runDockerForWebApp({
    web_app_directory,
    ipc: "host",
    network: "host",
    env: {
      /** To run tests against built version */
      URL: `http://localhost:${port}`,
    },
    image: "mcr.microsoft.com/playwright:v1.58.0-noble",
    shCommand: "cd e2e && npm install --silent && npm test",
  });
  return result;
};
