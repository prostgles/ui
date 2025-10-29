import { getCommandElemSelector, getDataKeyElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const fileImporter: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed },
  addScene,
) => {
  await openConnection("prostgles_video_demo");
  await openMenuIfClosed();
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("dashboard.menu.create"),
        duration: 1000,
      },
    ],
  });
  await page.getByTestId("dashboard.menu.create").click();
  await page.waitForTimeout(500);
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getDataKeyElemSelector("import file"),
        duration: 1000,
      },
    ],
  });
  await page
    .getByTestId("dashboard.menu.create")
    .locator(getDataKeyElemSelector("import file"))
    .click();
  const csvContent = `Name,Email,Age,Department
    Alice Wilson,alice@example.com,28,Engineering
    Charlie Brown,charlie@example.com,32,Marketing
    Diana Prince,diana@example.com,29,Sales
    Edward Norton,edward@example.com,31,HR`;
  await page.waitForTimeout(500);
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("FileBtn"),
        duration: 1000,
      },
    ],
  });
  await page.getByTestId("FileBtn").setInputFiles({
    name: "contacts.csv",
    mimeType: "text/plain",
    buffer: Buffer.from(csvContent),
  });
  await page.waitForTimeout(1500);
  await addScene();
};
