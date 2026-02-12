import { getRootDir } from "@src/electronConfig";
import { tout } from "@src/utils/tout";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const dashboardTypesContent = readFileSync(
  join(__dirname, "..", "..", "..", "..", "..", "common", "DashboardTypes.ts"),
  "utf-8",
);
if (!dashboardTypesContent) {
  throw new Error("Failed to read DashboardTypes.ts");
}

/**
 * Electron builder strips out ts files in production builds, so we need to
 * save them as built js files.
 */
export const saveTypescriptFilesForProduction = async () => {
  if (process.env.NODE_ENV === "production") return; // Skip in production
  const commonDir = `${getRootDir()}/../common`;

  await tout(3000); // Wait for any potential file changes to settle

  // const expectedContent = readFileSync(
  //   `${commonDir}/DashboardTypes.ts`,
  //   "utf-8",
  // );
  // saveTsAsStringValue({
  //   variableName: "dashboardTypesContent",
  //   content: expectedContent,
  //   commonDir,
  // });

  saveTsAsStringValue({
    variableName: "prostglesApiTypes",
    content: getProstglesApiTypes(),
    commonDir,
  });
};

const getProstglesApiTypes = () => {
  const commonHandlers = readFileSync(
    getRootDir() + "/node_modules/prostgles-types/dist/index.d.ts",
    "utf-8",
  );
  const viewHandlerStart = getTextBetween(
    commonHandlers,
    "export type ViewHandler",
    "export type JoinMakerOptions",
  );
  const clientHandlers = readFileSync(
    getRootDir() +
      "/../client/node_modules/prostgles-client/dist/prostgles.d.ts",
    "utf-8",
  );

  const fullHandlers =
    viewHandlerStart +
    "\n" +
    getTextBetween(
      clientHandlers,
      "export type AsyncResult",
      "type SyncDebugEvent",
    );

  return fullHandlers;
};
const getTextBetween = (str: string, start: string, end: string): string => {
  const startIndex = str.indexOf(start);
  if (startIndex === -1) throw "Start string not found";
  const endIndex = str.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw "End string not found";
  const result = str.slice(startIndex, endIndex).trim();
  if (!result) throw "No text found between markers";
  return result;
};

export const saveTsAsStringValue = ({
  content,
  variableName,
  commonDir,
}: {
  variableName: string;
  content: string;
  commonDir: string;
}) => {
  let currentContent = "";
  const commonBuiltDir = join(__dirname, "../../../common");
  try {
    // eslint-disable-next-line security/detect-non-literal-require
    currentContent = require(join(commonBuiltDir, variableName))[
      variableName
    ] as string;
  } catch {}
  if (content.trim() !== currentContent.trim()) {
    const escapedContent = content
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const newContent = `/**
 * Generated file. Do not edit.
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export const ${variableName} = \`${escapedContent}\n\`;`;
    writeFileSync(`${commonDir}/${variableName}.ts`, newContent);
    console.log({ content, currentContent });
    throw new Error(
      `${variableName}.ts content has changed: Make sure the generated variable is used and built`,
    );
  }
};
