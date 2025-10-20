import { dashboardTypesContent } from "@common/dashboardTypesContent";
import { readFileSync, writeFileSync } from "fs";
import { getRootDir } from "@src/electronConfig";

export const testDashboardTypesContent = () => {
  const commonDir = `${getRootDir()}/../common`;
  const actualContent = readFileSync(`${commonDir}/DashboardTypes.ts`, "utf-8");
  console.log("Comparing DashboardTypes.ts content...");
  if (actualContent.trim() !== dashboardTypesContent.trim()) {
    const escapedContent = actualContent
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const newContent = `/**
 * Generated file. Do not edit.
 * https://github.com/electron-userland/electron-builder/issues/5064
 */
export const dashboardTypesContent = \`${escapedContent}\n\`;`;
    writeFileSync(`${commonDir}/dashboardTypesContent.ts`, newContent);
    throw new Error(
      `DashboardTypes.ts content has changed. Please update the dashboardTypesContent in common/dashboardTypesContent.ts`,
    );
  }
};
