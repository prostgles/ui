import { connectionManager } from "@src/index";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import { glob } from "glob";
import { join } from "path";
import { defineFunction } from "prostgles-server";
import { defineFunctionGroupFunctions } from "../defineFunctionGroup";
import { buildWebApp } from "./webApp/buildWebApp";
import { getReactComponents } from "./webApp/getReactComponents";
import { getTemplatedWebAppConnection } from "./webApp/getTemplatedWebAppConnection";
import { getValidatedWebAppPath } from "./webApp/getValidatedWebAppPath";
import { testWebApp } from "./webApp/testWebApp";
import { writeWebAppFiles } from "./webApp/writeWebAppFiles";

/** Copy template files over */
const templateDir = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "src",
  "ServiceManager",
  "services",
  "frontendDev",
  "src",
);

export const webAppServerFunctions = defineFunctionGroupFunctions({
  createWebAppFromTemplate: defineFunction({
    unrestrictedDbAccess: true,
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

      await copyFolder(templateDir, connection.web_app_directory);
      if (connection.port !== null) {
        const envFilePath = join(
          connection.web_app_directory,
          "client",
          ".env.development",
        );

        await writeFile(
          envFilePath,
          `VITE_API_URL=http://localhost:${connection.port}`,
          "utf-8",
        );
      }
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
  buildWebApp: defineFunction({
    input: {
      connectionId: "string",
      clean: { type: "boolean", optional: true },
    },
    run: buildWebApp,
  }),
  testWebApp: defineFunction({
    input: {
      connectionId: "string",
    },
    run: testWebApp,
  }),
  writeWebAppFiles: defineFunction({
    input: {
      connectionId: "string",
      bypassAllowList: { type: "boolean", optional: true },
      files: {
        record: {
          values: "string",
        },
      },
    },
    unrestrictedDbAccess: true,
    run: writeWebAppFiles,
  }),
  getWebAppComponents: defineFunction({
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
  getWebAppFileList: defineFunction({
    input: {
      connectionId: "string",
    },
    run: async ({ connectionId }, { dbo }) => {
      const { web_app_directory } = await getTemplatedWebAppConnection(
        dbo,
        connectionId,
      );
      /** Return all code files */
      // const codeFiles: Record<string, string> = {};
      const filePaths = await glob("**/*.*", {
        nodir: true,
        cwd: web_app_directory,
        ignore: ["**/node_modules/**", "**/build/**", "**/dist/**"],
        signal: AbortSignal.timeout(10_000),
        posix: true,
      });
      // await Promise.all(
      //   filePaths.map(async (filePath) => {
      //     const relativePath = filePath.replace(web_app_directory + "/", "");
      //     const content = await readFile(filePath, "utf-8");
      //     codeFiles[relativePath] = content;
      //   }),
      // );
      return filePaths;
    },
  }),
  readFile: defineFunction({
    input: {
      filePath: "string",
    },
    run: async ({ filePath }) => {
      const content = await readFile(filePath, "utf-8");
      return content;
    },
  }),
  saveFile: defineFunction({
    input: {
      filePath: "string",
      content: "string",
    },
    run: async ({ filePath, content }) => {
      await mkdir(join(filePath, ".."), { recursive: true });
      await writeFile(filePath, content, "utf-8");
      return true;
    },
  }),
  getWebAppFile: defineFunction({
    input: {
      connectionId: "string",
      relativePath: "string",
    },
    run: async ({ connectionId, relativePath }, { dbo }) => {
      const { web_app_directory } = await getTemplatedWebAppConnection(
        dbo,
        connectionId,
        true,
      );
      const { filePath } = getValidatedWebAppPath({
        web_app_directory,
        relativePath,
      });
      const content = await readFile(filePath, "utf-8");
      return content;
    },
  }),
  saveWebAppFile: defineFunction({
    input: {
      connectionId: "string",
      fileName: "string",
      content: "string",
    },
    run: async ({ connectionId, fileName, content }, { dbo }) => {
      const { web_app_directory } = await getTemplatedWebAppConnection(
        dbo,
        connectionId,
      );
      const filePath = join(web_app_directory, fileName);
      await mkdir(join(filePath, ".."), { recursive: true });
      await writeFile(filePath, content, "utf-8");
      return true;
    },
  }),
});

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
