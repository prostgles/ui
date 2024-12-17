import type { DeckGLMapDivDemoControls } from "../dashboard/Map/DeckGLMap";
import { runDbSQL } from "../dashboard/W_SQL/getDemoUtils";
import { tout } from "../pages/ElectronSetup";
import {
  click,
  getElement,
  movePointer,
  type,
  waitForElement,
} from "./demoUtils";

/** Close previous windows */
export const closeAllViews = async () => {
  let windowCloseBtn;
  do {
    windowCloseBtn = getElement("dashboard.window.close");
    windowCloseBtn?.click();
    await tout(400);
    const deleteSql = getElement<HTMLButtonElement>("CloseSaveSQLPopup.delete");
    deleteSql?.click();
  } while (windowCloseBtn);
};

export const dashboardDemo = async () => {
  await tout(500);

  const DEMO_WSP_PREFIX = "Demo Workspace ";
  const demoWspNameFilter = { "name.$like": `${DEMO_WSP_PREFIX}%` };
  await (window as any).dbs.workspaces.update(demoWspNameFilter, {
    deleted: true,
  });
  await (window as any).dbs.workspaces.delete(demoWspNameFilter);

  await click("dashboard.goToConnections");
  await tout(500);
  document
    .querySelector<HTMLAnchorElement>("[data-key^=food_delivery] a")!
    .click();

  await closeAllViews();

  const createWorkspace = async (name: string) => {
    await click("WorkspaceMenuDropDown");
    await click("WorkspaceMenuDropDown.WorkspaceAddBtn");
    const wspName = getElement("Popup.content", "input");
    (wspName as any)?.forceDemoValue(
      name || DEMO_WSP_PREFIX + Math.random().toFixed(2),
    );
    await click("WorkspaceAddBtn.Create");
  };

  const openTable = async (tableName: string) => {
    await tout(500);
    const tableList = getElement("dashboard.menu.tablesSearchList");
    if (!tableList) {
      await click("dashboard.menu");
      // await click("dashboard.menu");
      // await click("DashboardMenuHeader.togglePinned");
    }
    await click("dashboard.menu.tablesSearchList", `[data-key=${tableName}]`);
    // await click("DashboardMenuHeader.togglePinned");
  };

  // await createWorkspace();

  await closeAllViews();
  await openTable("users");
  await tout(500);
  await click("AddColumnMenu");
  await click("AddColumnMenu", "[data-key=Referenced]");
  await click("JoinPathSelectorV2");
  await click("JoinPathSelectorV2", `[data-key="(id = customer_id) orders"]`);

  await click("QuickAddComputedColumn");
  await click("QuickAddComputedColumn", `[data-key="$countAll`);

  await type("Customer Order Count", "", "#nested-col-name");
  await click("LinkedColumn.Add");

  /** Descending order count */
  await click("", `[role="columnheader"]:nth-child(2)`);
  await click("", `[role="columnheader"]:nth-child(2)`);
  await tout(1e3);

  await click("dashboard.window.viewEditRow", undefined, {
    nth: 0,
    noTimeToWait: true,
  });
  await click("JoinedRecords.toggle");
  await tout(1e3);
  await click(
    "JoinedRecords",
    `[data-key="orders"] button[data-label="Expand section"]`,
  );
  await tout(2e3);
  await click("JoinedRecords", `[data-command="SmartCard.viewEditRow"]`, {
    nth: 0,
  });
  await tout(1e3);
  await click("JoinedRecords.toggle");
  await tout(1e3);
  await click(
    "JoinedRecords",
    `[data-key="order_items"] button[data-label="Expand section"]`,
  );
  await tout(2e3);
  await click("Popup.close");
  await click("Popup.close");

  /** Add Map */
  await click("AddChartMenu.Map");
  await click("AddChartMenu.Map", `[data-key="location"]`);
  await tout(2e3);
  const mapDiv = document.querySelector(
    ".DeckGLMapDiv",
  ) as DeckGLMapDivDemoControls;
  const point = {
    /** Park */
    // latitude: 51.536,
    // longitude: -.1568
    /** Maida Vale */
    latitude: 51.5276,
    longitude: -0.1906,
  };
  const { x, y } = mapDiv.getLatLngXY(point);
  await movePointer(x, y);
  await mapDiv.zoomTo({ ...point, zoom: 19 });
  await tout(5e3);
  await click("ChartLayerManager");
  await click("ChartLayerManager.AddChartLayer.addLayer");
  // await click("ChartLayerManager.AddChartLayer.addLayer", `[data-key=${JSON.stringify(`"roads.geojson".geog`)}]`);
  await click(
    "ChartLayerManager.AddChartLayer.addLayer",
    `[data-key=${JSON.stringify(`"london_restaurants.geojson".geometry`)}]`,
  );
  await click("Popup.close");

  /** Set to col layout, add table, clone wsp */
  await click("dashboard.menu.settingsToggle");
  await click("dashboard.menu.settings.defaultLayoutType");
  await click("dashboard.menu.settings.defaultLayoutType", `[data-key="col"]`);
  await click("Popup.close");
  await openTable("orders");
  await click("WorkspaceMenuDropDown");
  await click("WorkspaceMenu.CloneWorkspace");

  await tout(1e3);
  await waitForElement("", ".DeckGLMapDiv");
  await waitForElement("", `.SilverGridChild[data-table-name="orders"]`);

  /** TODO: Fails due to page refresh 
   * Delete all workspaces and expect to be returned to a new blank workspace 
  await click("WorkspaceMenuDropDown");
  await click("WorkspaceDeleteBtn");
  await click("WorkspaceDeleteBtn.Confirm");
  await tout(1e3);
  if(document.querySelectorAll(`button[title="Workspace"]`).length !== 1){
    throw new Error("Expected a total of 2 workspaces");
  }
  await click("WorkspaceMenuDropDown");
  await click("WorkspaceDeleteBtn");
  await click("WorkspaceDeleteBtn.Confirm");
  */

  await tout(1e3);
  await waitForElement("dashboard.menu.sqlEditor");

  await tout(2e3);

  await click("dashboard.goToConnections");
  await click("", "[data-key^=crypto] a", { nth: 0 });

  // await createWorkspace();

  await closeAllViews();
  await runDbSQL(
    "DELETE FROM futures WHERE (now() - timestamp) > interval '30 minutes'",
  );
  await openTable("futures");

  await click("dashboard.window.toggleFilterBar");
  await type("btcusd", "", ".SmartFilterBar input");
  await click("", `[data-label="BTCUSDC"]`);
  await click("", ".FilterWrapper_Type");
  await click("", `[data-key="$in"]`);
  await type("btcu", "", ".FilterWrapper input.custom-input");
  await click("", `[data-key="BTCUSDC"]`);
  await click("", `[data-key="BTCUSDT"]`);

  await click("SmartAddFilter");
  await click("SmartAddFilter", `[data-key="timestamp"]`);
  await click("AgeFilter.comparator");
  await click("AgeFilter.comparator", `[data-key="<"]`);
  await type("7 minutes", "", ".AgeFilter input ");

  await click("", `[title="Expand/Collapse filters"]`);
  await click("AddChartMenu.Timechart");
  await click("ChartLayerManager");
  await click("TimeChartLayerOptions.aggFunc");
  await click("TimeChartLayerOptions.aggFunc.select");
  await click("TimeChartLayerOptions.aggFunc.select", `[data-key="$avg"]`);
  await click("TimeChartLayerOptions.numericColumn");
  await click("TimeChartLayerOptions.numericColumn", `[data-key="price"]`);
  await click("TimeChartLayerOptions.groupBy");
  await click("TimeChartLayerOptions.groupBy", `[data-key="symbol"]`);
  await click("Popup.close");
  await click("Popup.close");
  await tout(5e3);
};
