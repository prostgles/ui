import { tout } from "../pages/ElectronSetup";
import type { Command } from "../Testing";
import { click, getElement } from "./demoUtils";
import { videoDemoAccessControlScripts } from "./videoDemoAccessControlScripts";

export const accessControlDemo = async () => {
  await click("dashboard.goToConnConfig");
  await click("config.ac");
  await tout(1000);
  const existingRule = getElement<HTMLDivElement>("", `[data-key="default"]`);
  if (existingRule) {
    existingRule.click();
    await tout(200);
    await click("config.ac.removeRule");
  }

  for await (const { selector, timestamp } of videoDemoAccessControlScripts) {
    await click("", selector);
    console.log(selector);
    await tout(450);
  }

  await tout(1e3);
  await click("config.ac");
  await click("", `[data-key="default"] .ExistingAccessRules_Item_Header`);
  await tout(2500);
  await click(
    "SearchList.List",
    `[data-key="messages"] [data-command=${JSON.stringify("selectRuleAdvanced" satisfies Command)}]`,
  );
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
};
