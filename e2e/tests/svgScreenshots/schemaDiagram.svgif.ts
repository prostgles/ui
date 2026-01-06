import { getCommandElemSelector } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { closeWorkspaceWindows } from "utils/utils";

export const schemaDiagramSvgif: OnBeforeScreenshot = async (
  page,
  { openMenuIfClosed, openConnection },
  { addScene },
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
        type: "fadeIn",
        elementSelector: getCommandElemSelector("SchemaGraph"),
        duration: 500,
      },
      { type: "wait", duration: 1000 },
    ],
  });

  await page
    .getByTestId("SchemaGraph")
    .locator("canvas")
    .waitFor({ state: "visible" });

  for (const point of [
    [390, 430],
    [350, 440],
  ] satisfies [number, number][]) {
    await page.mouse.move(...point, { steps: 10 });
    await page.waitForTimeout(400);
    await addScene({
      animations: [
        {
          type: "moveTo",
          xy: point,
          duration: 500,
        },
        { type: "wait", duration: 1000 },
      ],
    });
  }

  await addScene({
    animations: [{ type: "moveTo", xy: [350, 460], duration: 200 }],
  });
  await addScene({
    animations: [{ type: "wait", duration: 4000 }],
  });
};
