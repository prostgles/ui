import { dirname, join, relative, resolve } from "path";

export const getValidatedWebAppPath = ({
  web_app_directory,
  relativePath,
}: {
  web_app_directory: string;
  relativePath: string;
}) => {
  const allowedPath = resolve(web_app_directory);
  const filePath = resolve(join(web_app_directory, relativePath));
  const dirPath = dirname(filePath);

  /** Ensure path does not escape web_app_directory */
  const relativeDirPath = relative(allowedPath, filePath);
  if (relativeDirPath.startsWith("..")) {
    throw new Error(
      `Invalid file path: ${relativePath}. Must be within web app directory: ${web_app_directory}`,
    );
  }
  return { filePath, dirPath };
};
