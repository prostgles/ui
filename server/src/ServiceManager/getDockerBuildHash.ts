import crypto from "crypto";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

export const getDockerBuildHash = async (
  contextDir: string,
): Promise<string> => {
  if (!existsSync(join(contextDir, "Dockerfile"))) {
    throw new Error(`Service Dockerfile not found in: ${contextDir}`);
  }
  const hashes: Map<string, string> = new Map();

  const files = await getFilesRecursively(contextDir);
  files.sort();

  // Hash each file
  for (const file of files) {
    const fullPath = join(contextDir, file);
    hashes.set(file, calculateFileHash(fullPath));
  }

  // Create combined hash from all file hashes
  const combinedHashInput = Object.entries(hashes)
    .map(([file, hash]) => `${file}:${hash}`)
    .join("\n");

  const contextHash = crypto
    .createHash("sha256")
    .update(combinedHashInput)
    .digest("hex");

  return contextHash;
};
const getFilesRecursively = async (
  dir: string,
  fileList: string[] = [],
  baseDir = dir,
) => {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(dir, file.name);
    const relativePath = relative(baseDir, filePath);

    if (file.isDirectory()) {
      await getFilesRecursively(filePath, fileList, baseDir);
    } else {
      fileList.push(relativePath);
    }
  }

  return fileList;
};

const calculateFileHash = (filePath: string) => {
  const content = readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
};
