import { type Command, getCommandElemSelector } from "../../Testing";
import { tout } from "../../pages/ElectronSetup";

const clickCommand = async (cmd: Command, delay = 500) => {
  await tout(delay);
  const elem = document.querySelector<HTMLButtonElement>(
    getCommandElemSelector(cmd),
  );
  if (!elem) {
    console.warn("Not found: ", cmd);
  }
  elem?.click();
  return elem;
};

export const DemoFileTable = async () => {
  const enableFileStorage = async () => {
    clickCommand("dashboard.goToConnConfig");
    await clickCommand("config.files");
    await clickCommand("config.files.toggle");
    await clickCommand("config.files.toggle.confirm");
  };
  const uploadFile = async () => {
    await clickCommand("config.goToConnDashboard");
    await clickCommand("dashboard.menu");
    await clickCommand("dashboard.menu.fileTable");
  };
  await enableFileStorage();
  await uploadFile();
};

export const DemoBackup = async () => {
  /**
   * Show backup & restore
   */
  clickCommand("dashboard.goToConnConfig");
  clickCommand("config.bkp");
  clickCommand("config.bkp.create");
  clickCommand("config.bkp.create.start");
  await tout(3500);
};

export const DemoAccessControl = async () => {
  /**
   * Create access rule
   */
  clickCommand("dashboard.goToConnConfig");
  await clickCommand("config.ac");
  await clickCommand("config.ac.create");
  await clickCommand("config.ac.edit.user");
  const input = await clickCommand("config.ac.edit.user.select");
  const reactHandlerKey = Object.keys(input ?? {}).find((v) =>
    v.includes("__reactEventHandlers"),
  );
  if (!reactHandlerKey || !input) {
    return;
  }
  input[reactHandlerKey].onChange({ currentTarget: { value: "support" } });
  await clickCommand("config.ac.edit.user.select.create");
  input
    .closest(".SearchList")
    ?.querySelector<HTMLInputElement>(
      ".SearchList_Suggestions #targetUserGroups",
    )
    ?.click();
  await clickCommand("config.ac.edit.user.select.done");
  document
    .querySelector<HTMLButtonElement>(
      `${getCommandElemSelector("config.ac.edit.type")} [value='Custom']`,
    )
    ?.click();
  document
    .querySelector<HTMLDivElement>(
      `${getCommandElemSelector("config.ac.edit.dataAccess")}`,
    )
    ?.scrollIntoView();
};
