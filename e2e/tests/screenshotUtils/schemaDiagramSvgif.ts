import { getCommandElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";

export const schemaDiagramSvgif: OnBeforeScreenshot = async (
  page,
  { openMenuIfClosed, openConnection },
  addScene,
) => {
  await openConnection("prostgles_video_demo");
  await addScene();
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
};
