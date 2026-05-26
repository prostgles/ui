import type { DBS } from "@src/index";
import { getTemplatedWebAppConnection } from "./getTemplatedWebAppConnection";
import { getValidatedWebAppPath } from "./getValidatedWebAppPath";
import { readFile } from "fs/promises";

export const readWebAppFiles = async (
  {
    filePaths,
    connectionId,
  }: {
    connectionId: string;
    filePaths: string[];
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
    true,
  );
  const result: { filePath: string; content: string }[] = [];
  for (const relativePath of filePaths) {
    const { filePath } = getValidatedWebAppPath({
      web_app_directory,
      relativePath,
    });
    if (filePath.includes("node_modules")) {
      throw `Reading files from node_modules is not allowed: ${relativePath}`;
    }
    try {
      const content = await readFile(filePath, "utf-8");
      result.push({ filePath: relativePath, content });
    } catch (e) {
      result.push({
        filePath: relativePath,
        content: `Error reading file: ${(e as Error).message}`,
      });
    }
  }
  return result;
};
