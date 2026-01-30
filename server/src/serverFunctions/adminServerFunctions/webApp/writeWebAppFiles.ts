import type { DBS } from "@src/index";
import { lstat, mkdir, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { isEmpty } from "prostgles-types";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { getValidatedWebAppPath } from "./getValidatedWebAppPath";

const blockedFileWritePaths = [
  "client/node_modules",
  "client/package-lock.json",
  "e2e/node_modules",
  "e2e/package-lock.json",
];
const allowedFileWritePaths = ["client/public", "client/src", "e2e/tests"];

export const writeWebAppFiles = async (
  {
    files,
    connectionId,
    bypassAllowList,
  }: {
    connectionId: string;
    bypassAllowList?: boolean;
    files: Record<string, { content: string; description?: string }>;
  },
  {
    dbo,
  }: {
    dbo: DBS;
  },
) => {
  const { web_app_directory } = await getTemplatedWebAppConnection(
    dbo,
    connectionId,
  );
  if (isEmpty(files)) {
    throw "No files provided";
  }

  const validatedFiles = await Promise.all(
    Object.entries(files).map(async ([relativePath, fileData]) => {
      const { filePath, dirPath } = getValidatedWebAppPath({
        web_app_directory,
        relativePath,
      });
      /** Ensure path is not in blocked paths */
      const isBlocked = blockedFileWritePaths.some((blockedRelativePath) => {
        const blockedPath = resolve(
          join(web_app_directory, blockedRelativePath),
        );
        const rel = relative(blockedPath, filePath);
        return filePath === blockedRelativePath || !rel.startsWith("..");
      });
      if (isBlocked) {
        throw `Invalid file path: ${relativePath}. Writing to this path is never allowed.`;
      }

      /** Ensure path is in allowed paths */
      if (!bypassAllowList) {
        const isAllowed = allowedFileWritePaths.some((allowedRelativePath) => {
          const allowedPath = resolve(
            join(web_app_directory, allowedRelativePath),
          );
          const rel = relative(allowedPath, filePath);
          return filePath === allowedRelativePath || !rel.startsWith("..");
        });
        if (!isAllowed) {
          throw `Invalid file path: ${relativePath}. Writing to this path is not allowed without bypassAllowList: true. allowedFileWritePaths: ${allowedFileWritePaths.join(", ")}`;
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
};
