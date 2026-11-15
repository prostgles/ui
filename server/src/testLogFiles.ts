import { basename, dirname, join } from "path";

export const getTestLogFiles = (filePath: string) => {
  const directory = dirname(filePath);
  const fileName = basename(filePath);
  if (!fileName.endsWith(".log")) {
    throw new Error("PRGL_TEST_LOG_PATH must end with .log");
  }

  const name = fileName.slice(0, -4);
  if (!name) {
    throw new Error("PRGL_TEST_LOG_PATH must include a file name before .log");
  }
  const archivePrefix = `${name}.`;
  const isManagedFileName = (candidate: string) => {
    if (candidate === fileName) return true;
    if (!candidate.startsWith(archivePrefix) || !candidate.endsWith(".log")) {
      return false;
    }
    const index = candidate.slice(archivePrefix.length, -4);
    return (
      Boolean(index) &&
      [...index].every((char) => char >= "0" && char <= "9")
    );
  };

  return {
    directory,
    isManagedFileName,
    getArchivePath: (index: number) => join(directory, `${name}.${index}.log`),
  };
};
