import { getCommandElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { closeWorkspaceWindows } from "utils/utils";

export const schemaDiagramSvgif: OnBeforeScreenshot = async (
  page,
  { openMenuIfClosed, openConnection },
  addScene,
) => {
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("SchemaGraph"),
        duration: 1000,
      },
    ],
  });
  await page.getByTestId("SchemaGraph").click();
  await page.waitForTimeout(1500);
  await addScene({
    animations: [
      {
        type: "growIn",
        elementSelector: getCommandElemSelector("SchemaGraph"),
        duration: 1000,
      },
      { type: "wait", duration: 1000 },
    ],
  });

  const chat_members_tablePosition = [481, 273] as const;
  await page.mouse.move(...chat_members_tablePosition);
  await page.mouse.click(...chat_members_tablePosition);
  await page.waitForTimeout(1500);
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "moveTo",
        xy: chat_members_tablePosition as [number, number],
        duration: 1000,
      },
    ],
  });
};
