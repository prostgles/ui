import { getCommandElemSelector, getDataKey } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { closeWorkspaceWindows } from "utils/utils";

export const schemaDiagramSvgif: OnBeforeScreenshot = async (
  page,
  { openMenuIfClosed, openConnection },
  { addScene, addSceneAnimation },
) => {
  // if (Math.PI) {
  //   throw "FISDW";
  // }
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await page.waitForTimeout(500);
  // await addScene({
  //   animations: [
  //     { type: "wait", duration: 1000 },
  //     {
  //       type: "click",
  //       elementSelector: getCommandElemSelector("SchemaGraph"),
  //       duration: 1000,
  //     },
  //   ],
  // });

  await page.getByTestId("SchemaGraph").click();
  await page.waitForTimeout(2500);
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
    [350, 440],
    [430, 350],
  ] satisfies [number, number][]) {
    await page.mouse.move(...point, { steps: 10 });
    await page.waitForTimeout(400);
    await addScene({
      animations: [
        {
          type: "moveCursor",
          xy: point,
          duration: 300,
        },
        { type: "wait", duration: 1000 },
      ],
    });
  }

  await addScene({
    animations: [{ type: "moveCursor", xy: [350, 460], duration: 200 }],
  });

  await addSceneAnimation(
    getCommandElemSelector("SchemaGraph.TopControls.linkColorMode"),
  );
  await addSceneAnimation(
    getCommandElemSelector("SchemaGraph.TopControls.linkColorMode") +
      " " +
      getDataKey("on-delete"),
  );
  await addScene({
    animations: [{ type: "wait", duration: 4000 }],
  });
};
