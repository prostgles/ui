import { click, getElement, waitForElement } from "../../../demo/demoUtils";
import { fixIndent, shouldBeEqual } from "../../../demo/sqlVideoDemo";
import { tout } from "../../../pages/ElectronSetup";
import type { DemoScript } from "../getDemoUtils";

export const testSqlCharts: DemoScript = async ({
  fromBeginning,
  moveCursor,
  runSQL,
}) => {
  const q0 = fixIndent(`
    SELECT 
      generate_series(now(), now() + '1 year'::interval, '1day'::interval) as tstamp, 
      random() * 100 as value
  `);
  const q1 = fixIndent(`
    WITH tbl as (
      ${q0}
    )
    SELECT * FROM tbl
  `);
  fromBeginning(false, q1);

  await click("AddChartMenu.Timechart");

  const l1 = await waitForElement<HTMLButtonElement>(
    "TimeChartLayerOptions.aggFunc",
    "",
    { nth: 0 },
  );
  shouldBeEqual("Avg(\nvalue\n),\ntstamp", l1.innerText);

  const timechartQueries = `${q1}\n\n\n${q0.replace("100 as value", "10 as value2")}`;
  fromBeginning(false, timechartQueries);

  const addChart = async (chartType: "Timechart" | "Map") => {
    moveCursor.pageDown();
    moveCursor.lineEnd();
    moveCursor.up(1);
    moveCursor.down(2);
    await click(`AddChartMenu.${chartType}`);
    await tout(500);
  };
  await addChart("Timechart");

  const checkL2 = async () => {
    const l2 = await waitForElement<HTMLButtonElement>(
      "TimeChartLayerOptions.aggFunc",
      "",
      { nth: 1 },
    );
    shouldBeEqual("Avg(\nvalue2\n),\ntstamp", l2.innerText);
  };
  await checkL2();

  const getCloseChartBtn = () => {
    return getElement<HTMLButtonElement>("dashboard.window.closeChart");
  };
  shouldBeEqual(true, !!getCloseChartBtn());

  /** Executing sql will hide charts */
  const minimiseCharts = async () => {
    await runSQL();
    await tout(1e3);
    shouldBeEqual(false, !!getCloseChartBtn());
  };

  /** Reopen chart by clicking add layer to chart button */
  const restoreCharts = async () => {
    moveCursor.pageDown();
    // moveCursor.up(1);
    await click("AddChartMenu.Timechart");
    await checkL2();
  };
  await minimiseCharts();
  await restoreCharts();

  /** Collapse chart button works */
  await click("dashboard.window.collapseChart");
  await tout(500);
  shouldBeEqual(false, !!getCloseChartBtn());

  /** Restore charts button works */
  await click("dashboard.window.restoreMinimisedCharts");
  await tout(500);
  shouldBeEqual(true, !!getCloseChartBtn());

  /** Map chart works */
  const qMap0 = fixIndent(`
    SELECT ST_SetSRID(ST_MakePoint(
      (random() * 0.01) + -0.1276, 
      (random() * 0.01) +  51.5074
    ), 4326) AS geom
    FROM generate_series(1, 100) as pt
  `);
  const qMap = fixIndent(`
    WITH london_center AS (
     ${qMap0}
    )
    SELECT geom
    FROM london_center
  `);
  fromBeginning(false, qMap);
  await addChart("Map");
  await waitForElement("MapExtentBehavior");

  fromBeginning(false, qMap0);
  await addChart("Map");
  await waitForElement("MapExtentBehavior");

  await click("dashboard.window.closeChart");
  await click("dashboard.window.closeChart");

  await tout(3e3);
};
