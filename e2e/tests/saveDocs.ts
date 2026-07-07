import { DOCS_DIR } from "svgScreenshots/utils/constants";
import { IS_GITHUB_WORKER } from "utils/constants";
import type { PageWIds } from "utils/utils";
import * as fs from "fs";
import * as path from "path";

export const saveDocs = async (page: PageWIds) => {
  if (!IS_GITHUB_WORKER) {
    /** Delete existing markdown docs */
    if (fs.existsSync(DOCS_DIR)) {
      fs.rmSync(DOCS_DIR, { force: true, recursive: true });
    }
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const files: { fileName: string; text: string }[] = await page.evaluate(
    async () => {
      //@ts-ignore
      return window.documentation;
    },
  );
  await page.waitForTimeout(100);
  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file.fileName);

    const preparedFileContent = getDocWithDarkModeImgTags(file.text);
    if (IS_GITHUB_WORKER) {
      const existingFile = fs.readFileSync(filePath, "utf-8");
      if (existingFile !== preparedFileContent) {
        console.error(existingFile, preparedFileContent);
        throw new Error(
          `File ${file.fileName} has changed. Please update the docs. Existing ${existingFile} Expected ${preparedFileContent}`,
        );
      }
    } else {
      fs.writeFileSync(filePath, preparedFileContent, "utf-8");
    }
    await page.waitForTimeout(100);
  }
};

const getDocWithDarkModeImgTags = (fileContent: string) => {
  const imgTags = fileContent.split("<img");
  // Must replace all img tags with theme aware src
  if (imgTags.length > 1) {
    imgTags.slice(1).forEach((imgTag, index) => {
      const tagText = "<img" + imgTag.split("/>")[0] + "/>";
      fileContent = fileContent.replaceAll(
        tagText,
        tagText.replace("/>", `style="border: 1px solid; margin: 1em 0;" />`),
      );
    });
  }
  return fileContent;
};
