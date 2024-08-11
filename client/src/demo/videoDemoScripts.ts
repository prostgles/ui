import type { Command } from "../Testing";
import type { DBS } from "../dashboard/Dashboard/DBS";
import type { DeckGLMapDivDemoControls } from "../dashboard/Map/DeckGLMap";
import { VIDEO_DEMO_DB_NAME } from "../dashboard/W_SQL/TestSQL";
import { getDemoUtils } from "../dashboard/W_SQL/getDemoUtils";
import { tout } from "../pages/ElectronSetup";
import { click, getElement, movePointer, type } from "./demoUtils";
import { sqlVideoDemo } from "./sqlVideoDemo";
import { videoDemoAccessControlScripts } from "./videoDemoAccessControlScripts";

const backupDemo = async () => {
  await click("dashboard.goToConnections");
  await click("", `[data-key=${JSON.stringify("prostgles_video_demo")}] a.LEFT-CONNECTIONINFO`);
  await click("dashboard.goToConnConfig");
  await tout(1e3);
  if(getElement("BackupControls.Restore")){
    await tout(1e3);
    return
  }
  await click("config.bkp");
  await tout(500);
  const deleteAllBtn = getElement<HTMLButtonElement>("BackupControls.DeleteAll", "button");
  if(deleteAllBtn){
    deleteAllBtn.click();
    const code = getElement<HTMLDivElement>("", `[title="confirmation-code"]`)?.innerText;
    const input = getElement<HTMLInputElement>("", `[name="confirmation"]`);
    (input as any)?.forceDemoValue(code);
    await click("BackupControls.DeleteAll.Confirm");
  }

  await click("config.bkp.create");
  await click("config.bkp.create.start");
  await tout(1e3);
  await click("BackupControls.Restore");
  await tout(2e3);

  await click("ClickCatchOverlay");
  await tout(500);
  await click("config.bkp.AutomaticBackups");
  await tout(500);
  await click("AutomaticBackups.destination");
  await tout(500);
  await click("AutomaticBackups.destination", `[data-key=Local]`);
  await tout(500);
  await click("AutomaticBackups.frequency");
  await tout(500);
  await click("AutomaticBackups.destination", `[data-key=daily]`);
  await tout(500);
  await click("AutomaticBackups.hourOfDay");
  await tout(2e3);
}

const fileDemo = async () => {
  await tout(2e3);
  await click("config.goToConnDashboard");
  await tout(1e3);
  if (!document.querySelector(`[data-table-name="messages"]`)) {
    await click("dashboard.menu.tablesSearchList", "[data-key='messages']");
    await tout(2e3);
  }
  await click("AddColumnMenu");
  await tout(1e3);
  await click("AddColumnMenu", "[data-key='CreateFileColumn']");

  await tout(500);
  await type("attachement", "Popup.content", "input");
  await tout(1e3);
  await click("CreateFileColumn.confirm");
  await tout(500);
  await click("dashboard.window.rowInsert");
  await tout(500);
  await click("SmartFormFieldOptions.AttachFile");
}

const acDemo = async () => {

  await click("dashboard.goToConnConfig");
  await click("config.ac");
  await tout(1000);
  const existingRule = getElement<HTMLDivElement>("", `[data-key="default"]`);
  if(existingRule){
    existingRule.click();
    await tout(200);
    await click("config.ac.removeRule");
  }

  for await (const { selector, timestamp } of videoDemoAccessControlScripts) {
    await click("", selector);
    console.log(selector)
    await tout(450);
  }

  await tout(1e3);
  await click("config.ac");
  await click("", `[data-key="default"]`);
  await tout(2500);
  await click("SearchList.List", `[data-key="messages"] [data-command=${JSON.stringify("selectRuleAdvanced" satisfies Command)}]`);
  await tout(1500);
  await click("MenuList", `[data-key="insert"]`);
  await tout(1500);
  await click("MenuList", `[data-key="update"]`);
  await tout(1500);
  await click("MenuList", `[data-key="delete"]`);
  await click("Popup.close");
  await click("ComparablePGPolicies");
  await tout(1500);
  await click("Popup.close");
  await click("dashboard.goToConnConfig");
  await tout(2500);
}


const sqlDemo = async () => {
  const getSqlWindow = () => Array.from(document.querySelectorAll<HTMLDivElement>(`[data-box-id][data-box-type=item]`)).find(n => n.querySelector(".ProstglesSQL"));
  if (!getSqlWindow()) {
    click("dashboard.menu.sqlEditor");
    await tout(1500);
  }
  const sqlWindow = getSqlWindow();
  const id = sqlWindow?.dataset!.boxId;
  if (!sqlWindow || !id) throw "not ok";
  await (window as any).dbs.windows.update({ id }, { sql_options: { $merge: [{ "executeOptions": "smallest-block" }] } });
  const testUtils = getDemoUtils({ id });

  const currDbName = await testUtils.runDbSQL(`SELECT current_database() as db_name`, {}, { returnType: "value" });
  if (currDbName === VIDEO_DEMO_DB_NAME) {
    return sqlVideoDemo(testUtils);
  }
}

/** Close previous windows */
const closeAllViews = async () => {
  let windowCloseBtn;
  do {
    windowCloseBtn = getElement("dashboard.window.close");
    windowCloseBtn?.click();
    await tout(400);
  } while (windowCloseBtn);
}

const dashboardDemo = async () => {
  await tout(500);
  
  const DEMO_WSP_PREFIX = "Demo Workspace ";
  const demoWspNameFilter = { "name.$like": `${DEMO_WSP_PREFIX}%` };
  await (window as any).dbs.workspaces.update(demoWspNameFilter, { deleted: true });
  await (window as any).dbs.workspaces.delete(demoWspNameFilter);

  await click("dashboard.goToConnections");
  await tout(500);
  document.querySelector<HTMLAnchorElement>("[data-key^=food_delivery] a")!.click();

  // await closeAllViews();

  const createWorkspace = async (name: string) => {
    await click("WorkspaceMenuDropDown");
    await click("WorkspaceMenuDropDown.WorkspaceAddBtn");
    const wspName = getElement("Popup.content", "input");
    (wspName as any)?.forceDemoValue(name || (DEMO_WSP_PREFIX + Math.random().toFixed(2)));
    await click("WorkspaceAddBtn.Create");
  }

  const openTable = async (tableName: string) => {
    const tableList = getElement("dashboard.menu.tablesSearchList");
    if(!tableList) {
      await click("dashboard.menu");
      await click("DashboardMenuHeader.togglePinned");
    }
    await click("dashboard.menu.tablesSearchList", `[data-key=${tableName}]`);
    await click("DashboardMenuHeader.togglePinned");
  }

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

  await type("Customer Order Count", "", "#nested-col-name")
  await click("LinkedColumn.Add");

  /** Descending order count */
  await click("", `[role="columnheader"]:nth-child(2)`);
  await click("", `[role="columnheader"]:nth-child(2)`);
  await tout(1e3);

  await click("dashboard.window.viewEditRow", undefined, { nth: 0, noTimeToWait: true });
  await click("JoinedRecords.toggle");
  await tout(1e3);
  await click("JoinedRecords", `[data-key="orders"] button[data-label="Expand section"]`);
  await tout(2e3);
  await click("JoinedRecords", `[data-command="SmartCard.viewEditRow"]`, { nth: 0 });
  await tout(2e3);
  await click("Popup.close");
  await click("Popup.close");

  /** Add Map */
  await click("AddChartMenu.Map");
  await click("AddChartMenu.Map", `[data-key="location"]`);
  await tout(2e3);
  const mapDiv = document.querySelector(".DeckGLMapDiv") as DeckGLMapDivDemoControls;
  const point = { 
    /** Park */
    // latitude: 51.536, 
    // longitude: -.1568 
    /** Maida Vale */
    latitude: 51.5276,
    longitude: -.1906
  }
  const { x, y } = mapDiv.getLatLngXY(point);
  await movePointer(x, y);
  await mapDiv.zoomTo({ ...point, zoom: 19 });
  await tout(5e3);
  await click("ChartLayerManager");
  await click("ChartLayerManager.AddChartLayer.addLayer");
  // await click("ChartLayerManager.AddChartLayer.addLayer", `[data-key=${JSON.stringify(`"roads.geojson".geog`)}]`);
  await click("ChartLayerManager.AddChartLayer.addLayer", `[data-key=${JSON.stringify(`"london_restaurants.geojson".geometry`)}]`);
  await click("Popup.close");
  await tout(2e3);
  await click("dashboard.goToConnections");
  await click("", "[data-key^=crypto] a", { nth: 0 });

  // await createWorkspace();
  
  await closeAllViews();
  await openTable("futures");

  await click("dashboard.window.toggleFilterBar");
  await type("btcusd", "", ".SmartFilterBar input");
  await click("", `[data-label="BTCUSDC"]`);
  await click("", ".FilterWrapper_Type");
  await click("", `[data-key="$in"]`);
  await type("btcu",  "", ".FilterWrapper input.custom-input");
  await click("", `[data-key="BTCUSDC"]`);
  await click("", `[data-key="BTCUSDT"]`);
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
}


const loadTest = async () => {
  const dbs: DBS = (window as any).dbs;
  console.log(dbs)
}

export const VIDEO_DEMO_SCRIPTS = {
  backupDemo,
  fileDemo,
  acDemo,
  sqlDemo,
  dashboardDemo,
  loadTest,
}

// startRecordingDemo();