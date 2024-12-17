import { tout } from "../pages/ElectronSetup";
import { click, getElement } from "./demoUtils";

export const backupDemo = async () => {
  await click("dashboard.goToConnections");
  await click(
    "",
    `[data-key=${JSON.stringify("prostgles_video_demo")}] a.LEFT-CONNECTIONINFO`,
  );
  await click("dashboard.goToConnConfig");
  await tout(1e3);
  if (getElement("BackupControls.Restore")) {
    await tout(1e3);
    return;
  }
  await click("config.bkp");
  await tout(500);
  const deleteAllBtn = getElement<HTMLButtonElement>(
    "BackupControls.DeleteAll",
    "button",
  );
  if (deleteAllBtn) {
    deleteAllBtn.click();
    const code = getElement<HTMLDivElement>(
      "",
      `[title="confirmation-code"]`,
    )?.innerText;
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
  await click("AutomaticBackups.frequency", `[data-key=daily]`);
  await tout(500);
  await click("AutomaticBackups.hourOfDay");
  await tout(2e3);
};
