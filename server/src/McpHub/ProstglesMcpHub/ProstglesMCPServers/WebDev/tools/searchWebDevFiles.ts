import { readFile } from "fs/promises";
import { glob } from "glob";
import { dirname, join } from "path";
import { isDefined } from "prostgles-types";

export const searchWebDevFiles = async ({
  contentQuery,
  fileNameQuery,
  extensions = "ts,tsx,js,jsx,html,css,json".split(","),
  web_app_directory,
  folder,
  limit = 50,
  maxDepth = 20,
  maxFilesPerFolder = 50,
  maxLineLength = 500,
}: {
  contentQuery: string;
  fileNameQuery?: string;
  extensions?: string[];
  web_app_directory: string;
  limit?: number;
  maxDepth?: number;
  maxFilesPerFolder?: number;
  maxLineLength?: number;
  folder: "client" | "e2e" | "";
}) => {
  const cwd = join(web_app_directory, folder);
  const extensionMatch =
    extensions.length === 1 ? extensions[0] : `{${extensions.join(",")}}`;
  const pattern = `**/*.${extensionMatch}`;
  const results = await glob(pattern, {
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "package-lock.json",
    ],
    maxDepth,
    cwd,
    nodir: true,
    absolute: false,
    posix: true,
  });

  const filteredResults =
    fileNameQuery ?
      results.filter((filePath) => filePath.includes(fileNameQuery))
    : results;

  const lastFolderFileCount: Map<string, number> = new Map();
  const result: {
    filePath: string;
    matchedContent: string;
  }[] = (
    await Promise.all(
      filteredResults.map(async (filePath) => {
        const content = await readFile(join(cwd, filePath), "utf-8");
        if (!content.toLowerCase().includes(contentQuery.toLowerCase())) {
          return;
        }

        /** Enforce max files per folder */
        const folderPath = dirname(filePath);
        const matchingFolder = lastFolderFileCount.get(folderPath);
        lastFolderFileCount.set(folderPath, (matchingFolder ?? 0) + 1);
        const currentCount = matchingFolder || 0;
        if (currentCount >= maxFilesPerFolder) {
          return {
            filePath: "[...truncated]",
            matchedContent: `File limit of ${maxFilesPerFolder} reached for folder ${folderPath}`,
          };
        }

        /** Return lines surrounding expression */
        const lines = content.split("\n");
        const matchingLinesIndices = lines
          .map((line, index) =>
            line.toLowerCase().includes(contentQuery.toLowerCase()) ?
              index
            : -1,
          )
          .filter((index) => index !== -1);

        const contextLines = new Set<string>();
        matchingLinesIndices.forEach((matchIndex) => {
          const start = Math.max(0, matchIndex - 5);
          const end = Math.min(lines.length - 1, matchIndex + 5);
          for (let i = start; i <= end; i++) {
            contextLines.add(lines[i]!.slice(0, maxLineLength)); // Limit line length
          }
        });
        return {
          filePath,
          matchedContent: Array.from(contextLines).join("\n...\n"),
        };
      }),
    )
  ).filter(isDefined);

  if (filteredResults.length > limit) {
    result.push({
      filePath: "[...truncated]",
      matchedContent: `Results truncated to first ${limit} matches.`,
    });
  }

  return { result, cwd };
};
