import * as fs from "fs";
import * as path from "path";
import { MINUTE } from "../../utils/utils";

export const getFilesFromDir = (
  dir: string,
  endWith: string,
  checkAge = true,
) => {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(endWith))
    .map((fileName) => {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, { encoding: "utf-8" });
      return { fileName, filePath, stat: fs.statSync(filePath), content };
    });

  if (checkAge) {
    const filesThatAreNotRecent = files.filter(
      (file) => file.stat.mtimeMs < Date.now() - 120 * MINUTE,
    );
    if (filesThatAreNotRecent.length) {
      throw `${JSON.stringify(endWith)} files are not recent: ${filesThatAreNotRecent
        .map((file) => file.fileName)
        .join(", ")}`;
    }
  }
  return files;
};
