import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { getRootDir } from "@src/electronConfig";
import { executeDockerCommand } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/DockerSandbox/executeDockerCommand";
import { rmSync } from "fs";
import { copyFile, lstat, mkdir, readdir, rm, writeFile } from "fs/promises";
import { glob } from "glob";
import { dirname, join, relative, resolve } from "path";
import {
  createServerFunctionWithContext,
  type DBOFullyTyped,
} from "prostgles-server";
import { isEmpty } from "prostgles-types";
import type { getServerFunctionsContext } from "../getServerFunctionsContext";

const blockedFileWritePaths = [
  "client/node_modules",
  "client/package-lock.json",
  "e2e/node_modules",
  "e2e/package-lock.json",
];
const allowedFileWritePaths = ["client/public", "client/src", "e2e/tests"];

export const getWebAppServerFunctions = (
  context: Awaited<ReturnType<typeof getServerFunctionsContext>>,
) => {
  const defineAdminFunction = createServerFunctionWithContext(
    context?.type === "admin" ? context : undefined,
  );

  const getTemplatedConnection = async (
    dbo: DBOFullyTyped<DBGeneratedSchema>,
    connectionId: string,
  ) => {
    const connection = await dbo.connections.findOne({ id: connectionId });
    if (!connection) throw "Connection not found";
    const { web_app_directory, web_app_templated } = connection;
    if (!web_app_directory) {
      throw "No web app directory set for connection";
    }
    if (!web_app_templated) {
      throw "Web app not templated yet";
    }
    return {
      ...connection,
      web_app_directory,
      web_app_templated,
    };
  };

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
        return templateDir;
      },
    }),
    buildWebApp: defineAdminFunction({
      input: {
        connectionId: "string",
        test: "boolean",
        clean: { type: "boolean", optional: true },
      },
      run: async ({ connectionId, clean, test }, { dbo }) => {
        const { web_app_directory } = await getTemplatedConnection(
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
        const uid = process.getuid?.();
        const gid = process.getgid?.();
        if (uid === undefined || gid === undefined) {
          throw "Cannot get user or group id for current process";
        }
        const result = await executeDockerCommand(
          [
            "run",
            "--rm",
            `-u`,
            `${uid}:${gid}`,
            "-v",
            `${web_app_directory}:/app`,
            "-w",
            "/app",
            "node:20-slim",
            "sh",
            "-c",
            `cd client && npm install --silent && npm run build ${test ? "cd ../e2e && npm test" : ""}`,
          ],
          {
            cwd: web_app_directory,
            timeout: 120_000,
          },
        );

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
      },
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
      run: async ({ files, connectionId, bypassAllowList }, { dbo }) => {
        const { web_app_directory } = await getTemplatedConnection(
          dbo,
          connectionId,
        );
        if (isEmpty(files)) {
          throw "No files provided";
        }

        const validatedFiles = await Promise.all(
          Object.entries(files).map(async ([relativePath, fileData]) => {
            const allowedPath = resolve(web_app_directory);
            const filePath = resolve(join(web_app_directory, relativePath));
            const dirPath = dirname(filePath);

            /** Ensure path does not escape web_app_directory */
            const relativeDirPath = relative(allowedPath, dirPath);
            if (relativeDirPath.startsWith("..")) {
              throw `Invalid file path: ${relativePath}. Must be within web app directory: ${web_app_directory}`;
            }

            /** Ensure path is not in blocked paths */
            const isBlocked = blockedFileWritePaths.some(
              (blockedRelativePath) => {
                const blockedPath = resolve(
                  join(web_app_directory, blockedRelativePath.slice(1)),
                );
                const rel = relative(blockedPath, filePath);
                return (
                  filePath === blockedRelativePath || !rel.startsWith("..")
                );
              },
            );
            if (isBlocked) {
              throw `Invalid file path: ${relativePath}. Writing to this path is never allowed.`;
            }

            /** Ensure path is in allowed paths */
            if (!bypassAllowList) {
              const isAllowed = allowedFileWritePaths.some(
                (allowedRelativePath) => {
                  const allowedPath = resolve(
                    join(web_app_directory, allowedRelativePath.slice(1)),
                  );
                  const rel = relative(allowedPath, filePath);
                  return (
                    filePath === allowedRelativePath || !rel.startsWith("..")
                  );
                },
              );
              if (!isAllowed) {
                throw `Invalid file path: ${relativePath}. Writing to this path is not allowed without bypassAllowList: true.`;
              }
            }

            /** Ensure not a symlink */
            try {
              const isSymLink = (await lstat(filePath)).isSymbolicLink();
              if (isSymLink) {
                throw `Invalid file path: ${relativePath}. Symbolic links are not allowed.`;
              }
            } catch {
              /** not found / no access */
            }
            return { fullPath: filePath, dirPath, fileData };
          }),
        );

        /** Write files */
        for (const { fullPath, dirPath, fileData } of validatedFiles) {
          await mkdir(dirPath, { recursive: true });
          await writeFile(fullPath, fileData.content, "utf-8");
        }
        return true;
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
