import { dashboardTypesContent } from "@common/dashboardTypesContent";
import { readFileSync } from "fs";
import { getRootDir } from "@src/electronConfig";

export const testDashboardTypesContent = () => {
  const actualContent = readFileSync(
    `${getRootDir()}/../common/DashboardTypes.ts`,
    "utf-8",
  );
  console.log("Comparing DashboardTypes.ts content...");
  if (actualContent.trim() !== dashboardTypesContent.trim()) {
    throw new Error(
      `DashboardTypes.ts content has changed. Please update the dashboardTypesContent in common/dashboardTypesContent.ts`,
    );
  }
};
