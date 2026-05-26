import { getCommandElemSelector, getDataKey } from "Testing";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { closeWorkspaceWindows, runDbsSql } from "utils/utils";
import { removeOtherElements } from "./utils/removeOtherElements";

export const schemaDiagramSvgif: OnBeforeScreenshot = async (
  page,
  { openMenuIfClosed, openConnection },
  { addScene, addSceneAnimation },
) => {
  // if (Math.PI) {
  //   throw "FISDW";
  // }
  await openConnection("food_delivery");
  await closeWorkspaceWindows(page);
  await openMenuIfClosed();
  await page.waitForTimeout(500);
  await runDbsSql(
    page,
    `
    UPDATE database_configs 
    SET table_schema_transform = \${table_schema_transform} 
    WHERE db_name = 'food_delivery'
  `,
    {
      table_schema_transform: {
        scale: 0.541,
        translate: { x: 693, y: 738.5 },
      },
    },
  );

  await page.getByTestId("SchemaGraph").click();
  await page.waitForTimeout(2500);
  await removeOtherElements(page, getCommandElemSelector("SchemaGraph"));
  await addScene({
    animations: [{ type: "wait", duration: 2000 }],
  });

  await page
    .getByTestId("SchemaGraph")
    .locator("canvas")
    .waitFor({ state: "visible" });

  for (const point of [
    [300, 450],
    [150, 450],
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
    animations: [{ type: "moveCursor", xy: [250, 460], duration: 200 }],
  });

  await page.reload();
  await openMenuIfClosed();
  await page.getByTestId("SchemaGraph").click();
  await page.waitForTimeout(1500);
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
