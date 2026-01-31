import { getRootDir } from "@src/electronConfig";
import { copyFile, mkdir, readdir, rm } from "fs/promises";
import { glob } from "glob";
import { join } from "path";
import { createServerFunctionWithContext } from "prostgles-server";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";
import { buildWebApp } from "./webApp/buildWebApp";
import { testWebApp } from "./webApp/testWebApp";
import { writeWebAppFiles } from "./webApp/writeWebAppFiles";
import { connectionManager } from "@src/index";
import { getTemplatedWebAppConnection } from "./webApp/getTemplatedWebAppConnection";
import { getReactComponents } from "./webApp/getReactComponents";

export const getWebAppServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const defineAdminFunction = createServerFunctionWithContext(
    context?.type === "admin" ? context : undefined,
  );

  return {
    createWebAppFromTemplate: defineAdminFunction({
      input: {
        connectionId: "string",
        clean: { type: "boolean", optional: true },
      },
      run: async ({ connectionId, clean }, { dbo }) => {
        const connection = await dbo.connections.findOne({ id: connectionId });
        if (!connection) throw "Connection not found";
        if (!connection.web_app_directory) {
          throw "No web app directory set for connection";
        }
        if (connection.web_app_templated || clean) {
          if (clean) {
            await rm(connection.web_app_directory, {
              recursive: true,
            });
          } else {
            throw "Already templated";
          }
        }
        const existingFiles = await glob(
          join(connection.web_app_directory, "*"),
          { signal: AbortSignal.timeout(5_000) },
        );
        if (existingFiles.length > 0) {
          throw "Web app directory is not empty";
        }
        /** Copy template files over */
        const templateDir = join(
          getRootDir(),
          "src",
          "ServiceManager",
          "services",
          "frontendDev",
          "src",
        );

        await copyFolder(templateDir, connection.web_app_directory);
        await dbo.connections.update(
          { id: connection.id },
          { web_app_templated: true },
        );
        connectionManager
          .getActiveConnectionSilentFail(connection.id)
          ?.prgl.reWriteDBSchema();
        return templateDir;
      },
    }),
    buildWebApp: defineAdminFunction({
      input: {
        connectionId: "string",
        clean: { type: "boolean", optional: true },
      },
      run: buildWebApp,
    }),
    testWebApp: defineAdminFunction({
      input: {
        connectionId: "string",
      },
      run: testWebApp,
    }),
    writeWebAppFiles: defineAdminFunction({
      input: {
        connectionId: "string",
        bypassAllowList: { type: "boolean", optional: true },
        files: {
          record: {
            values: {
              type: {
                content: "string",
                description: { type: "string", optional: true },
              },
            },
          },
        },
      },
      run: writeWebAppFiles,
    }),
    getWebAppComponents: defineAdminFunction({
      input: {
        connectionId: "string",
      },
      run: async ({ connectionId }, { dbo }) => {
        const { web_app_directory } = await getTemplatedWebAppConnection(
          dbo,
          connectionId,
        );
        const components = getReactComponents({
          web_app_directory,
        });
        return components;
      },
    }),
  };
};

const copyFolder = async (src: string, dest: string) => {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyFolder(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
};
