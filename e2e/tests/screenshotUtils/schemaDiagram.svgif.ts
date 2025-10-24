import { getCommandElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";
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
  await addScene();

  const chat_members_tablePosition = [481, 273] as const;
  await page.mouse.move(...chat_members_tablePosition);
  await page.mouse.click(...chat_members_tablePosition);
  await page.waitForTimeout(1500);
  await addScene();
};
