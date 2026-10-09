import { type Locator, type Page as PG, expect } from "@playwright/test";
import {
  type Command,
  getCommandElemSelector,
  getDataKey,
} from "../../../../common/Testing";

type FuncNamesReturningLocatorObj = {
  [
    prop in keyof PG as PG[prop] extends (...args: any) => any ?
      prop extends "expect" ? never
      : prop extends "getByTestId" ? never
      : prop extends "evaluateHandle" ? never
      : prop extends "waitForFunction" ? never
      : ReturnType<PG[prop]> extends Promise<any> ? never
      : ReturnType<PG[prop]> extends Locator ? prop
      : never
    : never
  ]: 1;
};

type FuncNames = keyof FuncNamesReturningLocatorObj;

type LocatorFuncNamesReturningLocatorObj = {
  [
    prop in keyof Locator as Locator[prop] extends (...args: any) => any ?
      prop extends "expect" ? never
      : prop extends "getByTestId" ? never
      : prop extends "evaluateHandle" ? never
      : prop extends "waitForFunction" ? never
      : ReturnType<Locator[prop]> extends Promise<any> ? never
      : ReturnType<Locator[prop]> extends Locator ? prop
      : // ReturnType<Locator[prop]> extends Promise<Locator>? prop :
        never
    : never
  ]: 1;
};

export type PageWIds = Omit<PG, FuncNames | "getByTestId"> & {
  getByTestId: (command: Command) => LocatorWIds;
} & {
  [funcName in FuncNames]: (
    ...args: Parameters<PG[funcName]>
  ) => Omit<ReturnType<PG[funcName]>, "getByTestId"> &
    Pick<PageWIds, "getByTestId">;
};

type LocatorFuncNames = keyof LocatorFuncNamesReturningLocatorObj;
type LocatorOverridenFuncNames = "getByTestId" | "all" | "last";

export type LocatorWIds = Omit<
  Locator,
  LocatorFuncNames | LocatorOverridenFuncNames
> & {
  getByTestId: (command: Command) => LocatorWIds;
  all: () => Promise<LocatorWIds[]>;
  first: () => LocatorWIds;
  last: () => LocatorWIds;
} & {
  [funcName in LocatorFuncNames]: (
    ...args: Parameters<Locator[funcName]>
  ) => Omit<ReturnType<Locator[funcName]>, LocatorOverridenFuncNames> &
    Pick<LocatorWIds, LocatorOverridenFuncNames>;
};

export const fillSmartForm = async (
  page: PageWIds,
  tableName: string,
  values: Record<string, string | Record<string, any> | Record<string, any>[]>,
) => {
  const smartFormLocator = `${getTestId("SmartForm")}${getDataKey(tableName)}`;
  for (const [key, valueOrRowOrRows] of Object.entries(values)) {
    const unescapedSelector = `${tableName}-${key}`;
    const escapedSelector = await page.evaluate(
      (unescapedSelector) => CSS.escape(unescapedSelector),
      unescapedSelector,
    );
    if (typeof valueOrRowOrRows === "string") {
      const value = valueOrRowOrRows;
      const elem = await page.locator("input#" + escapedSelector);
      await elem.fill(value);
      const selectElem = await page.locator(
        `[data-key=${JSON.stringify(key)}] .FormField_Select`,
      );
      if (await selectElem.isVisible()) {
        await selectElem.click();
        await page
          .getByTestId("SearchList.List")
          .locator(`[data-key=${JSON.stringify(value)}]`)
          .click();
      }
      /** Joined records */
    } else if (Array.isArray(valueOrRowOrRows)) {
      const nestedTableName = key;

      // const tabItem = await page.locator(
      //   `${smartFormLocator} ${getTestId("JoinedRecords")} ${getDataKey(nestedTableName)}`,
      // );
      // const isActive = await tabItem.getAttribute("aria-current");
      // if (isActive !== "true") {
      //   await tabItem.click();
      // }
      for (const nestedRow of valueOrRowOrRows) {
        await page
          .locator(
            `${getTestId("JoinedRecords.AddRow")}${getDataKey(nestedTableName)}`,
          )
          .click();
        await fillSmartFormAndInsert(page, nestedTableName, nestedRow);
      }

      /** Nested insert into fkey */
    } else if (typeof valueOrRowOrRows === "object") {
      const nestedInsertBtn = await page
        .locator(
          `${getTestId("SmartFormField")}${getDataKey(key)} ${getTestId("SmartFormFieldOptions.NestedInsert")}`,
        )
        .first();
      const nestedTableName = await nestedInsertBtn.getAttribute("data-key");
      if (!nestedTableName) throw `nestedTableName not found for ${key}`;
      await nestedInsertBtn.click();
      await fillSmartFormAndInsert(page, nestedTableName, valueOrRowOrRows);
    }
  }

  return page.locator(smartFormLocator);
};

export const fillSmartFormAndInsert = async (
  page: PageWIds,
  tableName: string,
  values: Record<string, string | Record<string, any> | Record<string, any>[]>,
) => {
  const form = await fillSmartForm(page, tableName, values);
  await page.waitForTimeout(200);
  await form.getByTestId("SmartForm.insert").click();
  await page.waitForTimeout(1200);
  await expect(form).not.toBeVisible(getTimeout(2 * MINUTE));
};

export const clickInsertRow = async (
  page: PageWIds,
  tableName: string,
  useTopBtn = false,
) => {
  await page
    .getByTestId(
      useTopBtn ?
        "dashboard.window.rowInsertTop"
      : "dashboard.window.rowInsert",
    )
    .and(page.locator(`[data-key=${JSON.stringify(tableName)}]`))
    .click();
  await page.waitForTimeout(200);
};

export const insertRow = async (
  page: PageWIds,
  tableName: string,
  row: Record<string, string>,
  useTopBtn = false,
) => {
  await clickInsertRow(page, tableName, useTopBtn);
  await fillSmartFormAndInsert(page, tableName, row);
  await page.waitForTimeout(2200);
};

export const getTestId = (testid: Command) =>
  `[data-command=${JSON.stringify(testid)}]` as const;

export const openTable = async (
  page: PageWIds,
  namePartStart: string,
  exact = false,
) => {
  await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
  await page.keyboard.press("Control+KeyP");
  await page.waitForTimeout(200);
  const searchAlLInput = await page.getByTestId("SearchAll");
  await searchAlLInput.waitFor({ state: "visible" });
  await searchAlLInput.fill(namePartStart);
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  /** Ensure table was opened */
  const table = page.locator(
    `[data-table-name${exact ? "=" : "^="}${JSON.stringify(namePartStart)}]`,
  );

  await expect(table).toBeVisible();
  await page.waitForTimeout(1000);
};

export const MINUTE = 60e3;

export const getTimeout = (base: number) => ({
  timeout: base * (process.env.CI ? 3 : 1),
});

export const getTableWindow = (page: PageWIds, tableName: string) => {
  return page.locator(`[data-table-name=${JSON.stringify(tableName)}]`);
};

export const openConnection = async (
  page: PageWIds,
  connectionName: string,
) => {
  await page.goto("/connections");
  await page
    .locator(getDataKey(connectionName))
    .getByTestId("Connection.openConnection")
    .click();
  await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
};

export const getDashboardUtils = (page: PageWIds) => {
  const _open = openConnection.bind(null, page);
  const openMenuIfClosed = async (closeMenu = false) => {
    await page.waitForTimeout(1500);
    const menuCloseButton = await page
      .getByTestId("DashboardMenu")
      .getByTestId("Popup.close");
    const menuPinnedButton = await page.locator(
      getCommandElemSelector("DashboardMenuHeader.togglePinned") +
        getDataKey("pinned"),
    );
    const menuIsOpen =
      (await menuCloseButton.count()) ? "close"
      : (await menuPinnedButton.count()) ? "unpinn"
      : undefined;
    if (menuIsOpen) {
      if (closeMenu) {
        if (menuIsOpen === "close") {
          await menuCloseButton.click();
        } else {
          await menuPinnedButton.click();
        }
      }
      return;
    }
    const menuBtn = await page.getByTestId("dashboard.menu");
    if ((await menuBtn.count()) && (await menuBtn.isEnabled())) {
      await menuBtn.click();
    }
  };
  const toggleMenuPinned = async (shouldBePinned?: boolean) => {
    await page.waitForTimeout(1500);
    const toggleBtn = await page.getByTestId(
      "DashboardMenuHeader.togglePinned",
    );
    const menuBtn = await page.getByTestId("dashboard.menu");
    const menuIsPinned = await menuBtn.isDisabled();
    if ((await toggleBtn.count()) && (await toggleBtn.isEnabled())) {
      if (menuIsPinned && shouldBePinned) {
        return;
      }
      await toggleBtn.click();
    } else if (shouldBePinned) {
      await menuBtn.click();
      await page.getByTestId("DashboardMenuHeader.togglePinned").click();
    }
  };

  return {
    openConnection: _open,
    openMenuIfClosed,
    toggleMenuPinned,
  };
};

export const setOrAddWorkspace = async (
  page: PageWIds,
  workspaceName: string,
) => {
  const workspaceList = await page.getByTestId("WorkspaceMenu.list");
  await workspaceList.waitFor({ state: "visible", timeout: 10e3 });
  await page.waitForTimeout(1500);
  const toggleBtn = await page
    .getByTestId("WorkspaceMenu.list")
    .getByText(workspaceName, { exact: true });

  if (await toggleBtn.count()) {
    await toggleBtn.click();
  } else {
    await page.getByTestId("WorkspaceMenuDropDown").click();
    await page.getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn").click();
    await page.getByLabel("New workspace name").fill(workspaceName);
    await page.getByTestId("WorkspaceAddBtn.Create").click();
  }
  await page.waitForTimeout(1e3);
};
