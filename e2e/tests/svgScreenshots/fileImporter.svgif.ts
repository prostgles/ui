import { getCommandElemSelector, getDataKeyElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { closeWorkspaceWindows, runDbSql } from "utils/utils";

export const fileImporter: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed },
  { addScene, addSceneAnimation },
) => {
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await addSceneAnimation(getCommandElemSelector("dashboard.menu.create"));

  await addSceneAnimation(getDataKeyElemSelector("import file"));

  const tableName = "contacts.csv";
  await runDbSql(page, "DROP TABLE IF EXISTS ${tableName:name}", { tableName });
  await page.waitForTimeout(500);
  const csvContent = `Name,Email,Age,Department
    Alice Wilson,alice@example.com,28,Engineering
    Charlie Brown,charlie@example.com,32,Marketing
    Diana Prince,diana@example.com,29,Sales
    Edward Norton,edward@example.com,31,HR`;
  await page.waitForTimeout(500);

  await addSceneAnimation(getCommandElemSelector("FileBtn"));

  await page.getByTestId("FileBtn").setInputFiles({
    name: tableName,
    mimeType: "text/plain",
    buffer: Buffer.from(csvContent),
  });
  await page.waitForTimeout(1500);
  await addScene({ animations: [{ type: "wait", duration: 2000 }] });
  await addSceneAnimation(getCommandElemSelector("FileImporterFooter.import"));
};
