import { getCommandElemSelector, getDataKeyElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const fileImporter: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed },
  { addScene, addSceneWithClickAnimation },
) => {
  await openConnection("prostgles_video_demo");
  await openMenuIfClosed();
  await addSceneWithClickAnimation(
    getCommandElemSelector("dashboard.menu.create"),
  );

  await addSceneWithClickAnimation(getDataKeyElemSelector("import file"));

  const csvContent = `Name,Email,Age,Department
    Alice Wilson,alice@example.com,28,Engineering
    Charlie Brown,charlie@example.com,32,Marketing
    Diana Prince,diana@example.com,29,Sales
    Edward Norton,edward@example.com,31,HR`;
  await page.waitForTimeout(500);

  await addSceneWithClickAnimation(getCommandElemSelector("FileBtn"));

  await page.getByTestId("FileBtn").setInputFiles({
    name: "contacts.csv",
    mimeType: "text/plain",
    buffer: Buffer.from(csvContent),
  });
  await page.waitForTimeout(1500);
  await addScene();
};
