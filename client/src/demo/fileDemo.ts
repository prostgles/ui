import { tout } from "../pages/ElectronSetup";
import { click, type } from "./demoUtils";

export const fileDemo = async () => {
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
};
