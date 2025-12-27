import { Locator, Page as PG, expect } from "@playwright/test";
import * as path from "path";
import { Command, getDataKeyElemSelector } from "../Testing";
import { goTo } from "./goTo";
import { TEST_DB_NAME, USERS } from "./constants";

type FuncNamesReturningLocatorObj = {
  [prop in keyof PG as PG[prop] extends (...args: any) => any ?
    prop extends "expect" ? never
    : prop extends "getByTestId" ? never
    : prop extends "evaluateHandle" ? never
    : prop extends "waitForFunction" ? never
    : ReturnType<PG[prop]> extends Promise<any> ? never
    : ReturnType<PG[prop]> extends Locator ? prop
    : never
  : never]: 1;
};
type FuncNames = keyof FuncNamesReturningLocatorObj;
type LocatorFuncNamesReturningLocatorObj = {
  [prop in keyof Locator as Locator[prop] extends (...args: any) => any ?
    prop extends "expect" ? never
    : prop extends "getByTestId" ? never
    : prop extends "evaluateHandle" ? never
    : prop extends "waitForFunction" ? never
    : ReturnType<Locator[prop]> extends Promise<any> ? never
    : ReturnType<Locator[prop]> extends Locator ? prop
    : // ReturnType<Locator[prop]> extends Promise<Locator>? prop :
      never
  : never]: 1;
};
type LocatorFuncNames = keyof LocatorFuncNamesReturningLocatorObj;
export type PageWIds = Omit<PG, FuncNames | "getByTestId"> & {
  getByTestId: (command: Command) => LocatorWIds;
} & {
  [funcName in FuncNames]: (
    ...args: Parameters<PG[funcName]>
  ) => Omit<ReturnType<PG[funcName]>, "getByTestId"> &
    Pick<PageWIds, "getByTestId">;
};

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
export const getMonacoEditorBySelector = async (
  page: PageWIds,
  parentSelector: string,
) => {
  const monacoEditor = await page
    .locator(`${parentSelector} .monaco-editor`)
    .first();
  return monacoEditor;
};

export const getMonacoValue = async (
  page: PageWIds,
  parentSelector: string,
) => {
  await page.keyboard.press("Control+A");
  await page.waitForTimeout(1500);
  const monacoNode = await getMonacoEditorBySelector(page, parentSelector);
  const text = await monacoNode.evaluate((node) => {
    //@ts-ignore
    return node.parentElement!._getValue() as string;
  });
  // const text = await page.evaluate(
  //   () => window.getSelection()?.toString() ?? "",
  // );
  const normalizedText = text?.replace(/\u00A0/g, " "); // Replace char 160 with char 32
  return normalizedText;
};

type KeyPress = "Control" | "Shift";
type InputKey =
  | KeyPress
  | "Enter"
  | "Escape"
  | "Tab"
  | "Backspace"
  | "Delete"
  | "Space";
type ArrowKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
type ArrowKeyCombinations = `${KeyPress}+${ArrowKey | InputKey}`;
type KeyPressOrCombination = InputKey | ArrowKeyCombinations | ArrowKey;

/**
 * Will overwrite all previous content
 */
export const monacoType = async (
  page: PageWIds,
  parentSelector: string,
  text: string,
  {
    deleteAll,
    deleteAllAndFill,
    pressBeforeTyping,
    pressAfterTyping,
    keyPressDelay = 100,
  }: {
    deleteAll?: boolean;
    deleteAllAndFill?: boolean;
    pressBeforeTyping?: KeyPressOrCombination[];
    pressAfterTyping?: KeyPressOrCombination[];
    keyPressDelay?: number;
  } = { deleteAll: true },
) => {
  const monacoEditor = await getMonacoEditorBySelector(page, parentSelector);
  await monacoEditor.click();
  await page.waitForTimeout(500);

  if (deleteAll || deleteAllAndFill) {
    await page.keyboard.press("Control+A");
    await page.waitForTimeout(500);
    await page.keyboard.press("Delete");
  }
  await page.waitForTimeout(500);
  await monacoEditor.click();
  await monacoEditor.blur();
  await page.waitForTimeout(500);
  await monacoEditor.click();
  await page.waitForTimeout(500);

  for (const key of pressBeforeTyping ?? []) {
    await page.keyboard.press(key);
    await page.waitForTimeout(50);
  }
  if (!keyPressDelay) {
    await monacoEditor.evaluate((node, text) => {
      //@ts-ignore
      console.log(node.parentElement!.editorRef);
      //@ts-ignore
      node.parentElement.editorRef.setValue(text);
    }, text);
    // await monacoEditor.fill(text, { force: true });
  } else if (deleteAllAndFill) {
    await page.keyboard.insertText(text);
  } else {
    await page.keyboard.type(text, { delay: keyPressDelay });
  }
  for (const key of pressAfterTyping ?? []) {
    await page.keyboard.press(key);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
};

export const runSql = async (page: PageWIds, query: string) => {
  await monacoType(page, `.ProstglesSQL`, query);
  await page.waitForTimeout(300);
  await page.getByTestId("W_SQLBottomBar.runQuery").click();
  await page.waitForTimeout(200);
  await page.getByTestId("W_SQLBottomBar.runQuery").isEnabled({ timeout: 5e3 });
  await page.waitForTimeout(1e3);
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
  await page.waitForTimeout(200);
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

export const fillLoginFormAndSubmit = async (
  page: PageWIds,
  userNameAndPassword = "test_user",
) => {
  await page.locator("#username").waitFor({ state: "visible", timeout: 30e3 });
  await page.locator("#username").fill("");
  await page.locator("#username").fill(userNameAndPassword);
  await page.locator("#password").fill(userNameAndPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
};

export const login = async (
  page: PageWIds,
  userNameAndPassword = "test_user",
  url = "localhost:3004",
) => {
  await goTo(page, url);
  await fillLoginFormAndSubmit(page, userNameAndPassword);
  await page.locator("#username").waitFor({ state: "detached", timeout: 30e3 });
};

export const typeConfirmationCode = async (page: PageWIds) => {
  await page.waitForTimeout(200);
  const code = await page.getByTitle("confirmation-code").textContent();
  await page.waitForTimeout(200);
  await page
    .locator(`input[name="confirmation"]`)
    .fill(code ?? "code not found on the page");
  await page.waitForTimeout(200);
};

export const forEachLocator = async (
  page: PageWIds,
  match: () => Promise<LocatorWIds> | LocatorWIds,
  onMatch: (locator: LocatorWIds) => Promise<void>,
) => {
  let items: LocatorWIds[] = [];
  do {
    items = await (await match()).all();
    const firstItem = items[0];
    if (firstItem) {
      await onMatch(firstItem);
      await page.waitForTimeout(220);
    }
  } while (items.length);
};

export const closeWorkspaceWindows = async (page: PageWIds) => {
  await forEachLocator(
    page,
    () => page.getByTestId("dashboard.window.close"),
    async (closeBtn) => {
      await closeBtn.click();
      /** SQL windows need save or delete confirmation */
      const deleteSqlBtn = await page.getByRole("button", {
        name: "Delete",
        exact: true,
      });
      if (await deleteSqlBtn.count()) {
        await deleteSqlBtn.click();
      }
      await page.waitForTimeout(220);
    },
  );

  const closeBtnsCount = await page
    .getByTestId("dashboard.window.close")
    .count();
  if (closeBtnsCount) {
    throw `${closeBtnsCount} windows are still opened`;
  }
  await page.waitForTimeout(100);
};

export const getDataKey = (key: string) =>
  `[data-key=${JSON.stringify(key)}]` as const;
export const getTestId = (testid: Command) =>
  `[data-command=${JSON.stringify(testid)}]` as const;
export const getSelector = ({
  testid,
  dataKey,
}: {
  testid: Command | undefined;
  dataKey: string | undefined;
}) =>
  [
    testid && `[data-command=${JSON.stringify(testid)}]`,
    dataKey && `[data-key=${JSON.stringify(dataKey)}]`,
  ]
    .filter(Boolean)
    .join("");

type FFilter = { fieldName: string; value: string }[];
type FData = Record<string, string>;
export const setTableRule = async (
  page: PageWIds,
  tableName: string,
  rule: {
    select?: { excludedFields?: string[]; forcedFilter?: FFilter };
    insert?: { excludedFields?: string[]; forcedData?: FData };
    update?: {
      excludedFields?: string[];
      forcedFilter?: FFilter;
      forcedData?: FData;
    };
    delete?: { forcedFilter?: FFilter };
  },
  isFileTable: boolean,
) => {
  const tableRow = await page.locator(getDataKey(tableName));

  const addSmartFilter = async ({
    fieldName,
    value,
  }: {
    fieldName: string;
    value: string;
  }) => {
    await page.getByTestId("SmartAddFilter").click();
    await page.locator(getDataKey(fieldName)).click();
    const filterWrapperSelector = `${getTestId("FilterWrapper")}${getDataKey(fieldName)}`;
    await page
      .locator(`${filterWrapperSelector} input[type="text"]`)
      .fill(value);
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
  };

  const setForcedFilter = async (forcedFilter?: FFilter) => {
    if (!forcedFilter) return;

    await page.getByTestId("ForcedFilterControl.type").click();
    await page.getByTestId("ForcedFilterControl.type.enabled").click();

    for (const { fieldName, value } of forcedFilter) {
      await addSmartFilter({ fieldName, value });
    }
  };

  const setExcludedFields = async (excludedFields?: string[]) => {
    if (!excludedFields?.length) return;

    await page.getByTestId("FieldFilterControl.type").click();
    await page.getByTestId("FieldFilterControl.type.except").click();
    await page.getByTestId("FieldFilterControl.select").click();
    await page.getByTestId("SearchList.toggleAll").click();
    for (const field of excludedFields) {
      await page.locator(`[data-key=${JSON.stringify(field)}]`).click();
      await page.waitForTimeout(500);
    }
    await page.keyboard.press("Escape");
  };

  const setForcedData = async (forcedData?: FData) => {
    if (!forcedData) return;

    // await page.getByTestId("ForcedDataControl.toggle").click();
    // for(const [fieldName, value] of Object.entries(forcedData)){
    //   await page.getByTestId("ForcedDataControl.addColumn").click();
    //   await page.locator(`[data-key=${JSON.stringify(fieldName)}]`).click();
    //   await page.locator(`input#${tableName}-${fieldName}`).type(value);
    //   await page.waitForTimeout(500);
    // }

    await page.getByTestId("CheckFilterControl.type").click();
    await page.getByTestId("CheckFilterControl.type.enabled").click();

    for (const [fieldName, value] of Object.entries(forcedData)) {
      await addSmartFilter({ fieldName, value });
    }
  };

  const toggleFileRule = async () => {
    const ruleToggle = await page.getByTestId("RuleToggle");
    if (isFileTable) {
      await ruleToggle.click();
      await page.getByTestId("TablePermissionControls.close").click();
    }
  };

  if (rule.select) {
    await tableRow.getByTestId("selectRule").click();
    await toggleFileRule();
    await page.waitForTimeout(500);

    if (!isEmpty(rule.select)) {
      await tableRow.getByTestId("selectRuleAdvanced").click();

      await setExcludedFields(rule.select.excludedFields);
      await setForcedFilter(rule.select.forcedFilter);

      await page.getByTestId("TablePermissionControls.close").click();
      await page.waitForTimeout(500);
    }
  }

  if (rule.insert) {
    await tableRow.getByTestId("insertRule").click();
    await toggleFileRule();
    await page.waitForTimeout(500);

    if (!isEmpty(rule.select)) {
      await tableRow.getByTestId("insertRuleAdvanced").click();

      await setExcludedFields(rule.insert.excludedFields);
      await setForcedData(rule.insert.forcedData);

      await page.getByTestId("TablePermissionControls.close").click();
      await page.waitForTimeout(500);
    }
  }

  if (rule.update) {
    await tableRow.getByTestId("updateRule").click();
    await toggleFileRule();
    await page.waitForTimeout(500);

    if (!isEmpty(rule.select)) {
      await tableRow.getByTestId("updateRuleAdvanced").click();

      await setExcludedFields(rule.update.excludedFields);
      await setForcedFilter(rule.update.forcedFilter);
      await setForcedData(rule.update.forcedData);

      await page.getByTestId("TablePermissionControls.close").click();
      await page.waitForTimeout(500);
    }
  }

  if (rule.delete) {
    await tableRow.getByTestId("deleteRule").click();
    await toggleFileRule();
    await page.waitForTimeout(500);

    if (!isEmpty(rule.select)) {
      await tableRow.getByTestId("deleteRuleAdvanced").click();

      await setForcedFilter(rule.delete.forcedFilter);

      await page.getByTestId("TablePermissionControls.close").click();
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(500);
};

export const runDbsSql = async (
  page: PageWIds,
  query: string,
  args?: any,
  opts?: any,
) => {
  return runDbSql(page, query, args, opts, "dbs");
};

export const runDbSql = async (
  page: PageWIds,
  query: string,
  args?: any,
  opts?: any,
  dbType: "db" | "dbs" = "db",
) => {
  const [error, sqlResult] = (await page.evaluate(
    async ([query, args, opts, dbType]) => {
      try {
        const db = (window as any)[dbType];
        if (!db) throw dbType + " is missing";
        const data = await db.sql(query, args, opts);
        return [undefined, data];
      } catch (error) {
        return [error];
      }
    },
    [query, args, opts, dbType],
  )) as any;
  if (error) {
    console.error(`Error running sql:`, error);
    throw error;
  }
  return sqlResult;
};

export const openTable = async (page: PageWIds, namePartStart: string) => {
  await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
  await page.keyboard.press("Control+KeyP");
  await page.waitForTimeout(200);
  const searchAlLInput = await page.getByTestId("SearchAll");
  await searchAlLInput.waitFor({ state: "visible" });
  await searchAlLInput.fill(namePartStart);
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  /** Ensure table_name strats with */
  const table = page.locator(
    `[data-table-name^=${JSON.stringify(namePartStart)}]`,
  );

  /** Used for debugging */
  if (!table.isVisible()) {
    const v_triggers = await runDbsSql(
      page,
      `SELECT * FROM prostgles.v_triggers;`,
      {},
      { returnType: "rows" },
    );
    console.log(JSON.stringify({ v_triggers, namePartStart }));
    await page.waitForTimeout(500);
  }
  await expect(table).toBeVisible();
  await page.waitForTimeout(1000);
};
export const MINUTE = 60e3;
export const createDatabase = async (
  dbName: string,
  page: PageWIds,
  fromTemplates = false,
  owner?: { name: string; pass: string },
) => {
  await goTo(page, "localhost:3004/connections");
  await page
    .locator(`[data-command="ConnectionServer.add"][data-key^="usr@localhost"]`)
    .first()
    .click();
  // await page.waitForTimeout(3000);
  if (fromTemplates) {
    await page.getByTestId("ConnectionServer.add.newDatabase").click();
    await page.getByTestId("ConnectionServer.SampleSchemas").click();
    await page
      .getByTestId("ConnectionServer.SampleSchemas")
      .locator(`[data-key=${JSON.stringify(dbName)}]`)
      .click();
  } else {
    await page.getByTestId("ConnectionServer.add.newDatabase").click();
    await page
      .getByTestId("ConnectionServer.NewDbName")
      .locator("input")
      .fill(dbName);
  }
  if (owner) {
    await page.getByTestId("ConnectionServer.withNewOwnerToggle").click();
    await page.waitForTimeout(500);
    await page
      .getByTestId("ConnectionServer.NewUserName")
      .locator("input")
      .fill(owner.name);
    await page
      .getByTestId("ConnectionServer.NewUserPassword")
      .locator("input")
      .fill(owner.pass);
    await page.waitForTimeout(500);
  }
  await page.getByTestId("ConnectionServer.add.confirm").click();
  /* Wait until db is created */
  const databaseCreationTime = (fromTemplates ? 4 : 1) * MINUTE;
  const workspaceCreationAndLoatTime = 3 * MINUTE;
  await page
    .getByTestId("ConnectionServer.add.confirm")
    .waitFor({ state: "detached", timeout: databaseCreationTime });
  await page
    .getByTestId("dashboard.menu")
    .waitFor({ state: "visible", timeout: workspaceCreationAndLoatTime });
};

export const dropConnectionAndDatabase = async (
  dbName: string,
  page: PageWIds,
) => {
  await page.waitForTimeout(2000);
  const connectionSelector = `[data-key=${JSON.stringify(dbName)}]`;
  await page.locator(connectionSelector).getByTestId("Connection.edit").click();

  await page.getByTestId("Connection.edit.delete").click();
  await page.getByTestId("Connection.edit.delete.dropDatabase").click();
  await typeConfirmationCode(page);
  await page.getByTestId("Connection.edit.delete.confirm").click();
  await page.waitForTimeout(5000);

  return { connectionSelector };
};

export const selectAndUpsertFile = async (
  page: PageWIds,
  onOpenFileDialog: (page: PageWIds) => Promise<void>,
  onBeforePressInsert?: () => Promise<void>,
  isUpdate = false,
) => {
  // Start waiting for file chooser before clicking. Note no await.
  const fileChooserPromise = page.waitForEvent("filechooser");
  await onOpenFileDialog(page);
  const fileChooser = await fileChooserPromise;
  const resolvedPath = path.resolve(path.join(__dirname, "../../" + fileName));

  await fileChooser.setFiles(resolvedPath);
  await onBeforePressInsert?.();
  await page
    .getByRole("button", { name: isUpdate ? "Update" : "Insert", exact: true })
    .click();
  if (isUpdate) {
    await page
      .getByRole("button", { name: "Update row!", exact: true })
      .click();
  }
};

export const fileName = "icon512.png";
export const uploadFile = async (page: PageWIds) => {
  await clickInsertRow(page, "files");
  await page.waitForTimeout(200);
  await selectAndUpsertFile(page, (page) =>
    page.getByTestId("FileBtn").click(),
  );
};

export const isEmpty = (obj?: any) => {
  return !obj || Object.keys(obj).length === 0;
};

export const getSearchListItem = (
  page: PageWIds | LocatorWIds,
  { dataKey }: { dataKey: string },
) => {
  return page
    .getByTestId("SearchList.List")
    .locator(`[data-key=${JSON.stringify(dataKey)}]`);
};
export const getTableWindow = (page: PageWIds, tableName: string) => {
  return page.locator(`[data-table-name=${JSON.stringify(tableName)}]`);
};

export const setWspColLayout = async (page: PageWIds) => {
  await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
  await page.getByTestId("dashboard.menu.settingsToggle").click();
  await page.getByTestId("dashboard.menu.settings.defaultLayoutType").click();
  await page
    .getByTestId("dashboard.menu.settings.defaultLayoutType")
    .locator(`[data-key="col"]`)
    .click();
  await page.getByTestId("Popup.close").click();
};
export const disablePwdlessAdminAndCreateUser = async (page: PageWIds) => {
  await goTo(page);
  await page
    .getByRole("link", { name: "Users" })
    .waitFor({ state: "visible", timeout: 60e3 });
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page as PG).toHaveURL(/.*users/);
  await page.goto("localhost:3004/users", {
    waitUntil: "networkidle",
    timeout: 10e3,
  });
  await page.getByRole("button", { name: "Create admin user" }).click();
  await page.locator("#username").fill(USERS.test_user);
  await page.locator("#new-password").fill(USERS.test_user);
  await page.locator("#confirm_password").fill(USERS.test_user);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForTimeout(5e3);
};

export const createAccessRule = async (
  page: PageWIds,
  userType: "default" | "public",
) => {
  /** Set permissions */
  await page.getByTestId("config.ac").click();
  await page.waitForTimeout(1e3);
  await page.getByTestId("config.ac.create").click();

  /** Setting user type to default */
  await page.getByTestId("config.ac.edit.user").click();
  await page.getByRole("option").getByText(userType).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();

  /** Setting AC Type to custom */
  await page
    .getByTestId("config.ac.edit.type")
    .locator(`button[value="Custom"]`)
    .click();
};
export const createAccessRuleForTestDB = async (
  page: PageWIds,
  userType: "default" | "public",
) => {
  await login(page);
  await page.getByRole("link", { name: "Connections" }).click();
  await page.getByRole("link", { name: TEST_DB_NAME }).click();
  await page
    .getByTestId("dashboard.goToConnConfig")
    .waitFor({ state: "visible", timeout: 10e3 });
  await page.getByTestId("dashboard.goToConnConfig").click();

  await createAccessRule(page, userType);
};

export const enableAskLLM = async (
  page: PageWIds,
  maxRequestsPerDay: number,
  credsProvided = false,
) => {
  await page.getByTestId("AskLLMAccessControl").click();
  if (!credsProvided) {
    await page.getByTestId("SetupLLMCredentials.api").click();
    // await page.getByTestId("AddLLMCredentialForm").click();
    await page.getByTestId("dashboard.window.rowInsertTop").click();
    // await page.getByTestId("AddLLMCredentialForm.Provider").click();

    // await page
    //   .getByTestId("AddLLMCredentialForm.Provider")
    //   .locator(`[data-key="Custom"]`)
    //   .click();
    await runDbsSql(page, "DELETE FROM llm_providers WHERE id = 'Custom' ");
    await fillSmartFormAndInsert(page, "llm_credentials", {
      name: "my credential",
      api_key: "nothing",
      provider_id: {
        id: "Custom",
        api_url: "http://localhost:3004/mocked-llm",
        logo_url: "/icons/CloudQuestionOutline.svg",
        llm_models: [
          {
            name: "mymodel",
          },
        ],
      },
    });
    // await page.locator(`#endpoint`).fill("http://localhost:3004/mocked-llm");
    // await page.getByTestId("AddLLMCredentialForm.Save").click();
  }
  await page.getByTestId("AskLLMAccessControl.AllowAll").click();
  await page.waitForTimeout(1e3);
  if (maxRequestsPerDay) {
    await page
      .getByTestId("AskLLMAccessControl.llm_daily_limit")
      .locator("input")
      .fill(maxRequestsPerDay.toString());
  }
  await page.getByTestId("Popup.close").click();
};
export const getAskLLMLastMessage = async (page: PageWIds) => {
  const lastIncomingMessage = await page
    .getByTestId("AskLLM.popup")
    .locator(".message.incoming")
    .last();

  /** Await any in progress tool calls */
  const toolCallBtns = await lastIncomingMessage
    .getByTestId("ToolUseMessage.toggle")
    .all();

  await Promise.all(
    [...toolCallBtns, lastIncomingMessage].map((btn) =>
      btn.locator(".Loading").waitFor({ state: "detached", timeout: 30_000 }),
    ),
  );
  await page.waitForTimeout(1500);
  const response = await lastIncomingMessage.textContent();
  return response;
};

const waitForAllMatchingLocatorsToDisappear = async (
  locator: LocatorWIds,
  timeout = 30_000,
) => {
  const start = Date.now();
  let tries = 0;
  while (true) {
    const count = await locator.count();
    if (!count) {
      if (tries > 2) {
        return;
      } else {
        tries++;
      }
    } else if (Date.now() - start > timeout) {
      throw new Error(
        `Timeout waiting for locators to disappear. Still ${count} remaining.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

export const sendAskLLMMessage = async (
  page: PageWIds,
  msg: string,
  waitForLoadingToStop:
    | boolean
    | {
        onAfterSend: () => Promise<void>;
      } = false,
) => {
  await page.getByTestId("AskLLM.popup").getByTestId("Chat.textarea").fill(msg);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  if (waitForLoadingToStop) {
    if (typeof waitForLoadingToStop === "object") {
      await waitForLoadingToStop.onAfterSend();
    }
    await waitForAllMatchingLocatorsToDisappear(
      page
        .getByTestId("Chat.messageList")
        .locator(".message.incoming .Loading")
        .last(),
    );
  }
};
export const getLLMResponses = async (
  page: PageWIds,
  questions: string[],
  openWindow = true,
) => {
  if (openWindow) {
    await page.getByTestId("AskLLM").click();
  }
  await page.getByTestId("AskLLM.popup").waitFor({ state: "visible" });
  await page.waitForTimeout(2e3);
  const result: {
    response: string | null;
    isOk: boolean;
  }[] = [];

  for (const question of questions) {
    await sendAskLLMMessage(page, question);
    const response = await getAskLLMLastMessage(page);
    result.push({
      response,
      isOk: !!response?.includes("Mocked response"),
    });
  }
  if (openWindow) {
    await page.getByTestId("Popup.close").click();
  }
  return result;
};

export const openConnection = async (
  page: PageWIds,
  connectionName:
    | "sample_database"
    | "cloud"
    | "crypto"
    | "food_delivery"
    | "Prostgles UI state"
    | "prostgles_video_demo"
    | "Prostgles UI automated tests database",
) => {
  await goTo(page, "/connections");
  await page
    .locator(getDataKeyElemSelector(connectionName))
    .getByTestId("Connection.openConnection")
    .click();
  await page.waitForTimeout(1000);
};

export const loginWhenSignupIsEnabled = async (page: PageWIds) => {
  await goTo(page, "/login");
  await page.locator("#username").fill(USERS.test_user);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#password").waitFor({ state: "visible" });
  await page.locator("#password").fill(USERS.test_user);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("App.colorScheme").waitFor({ state: "visible" });
  await page.waitForTimeout(500);
};

const backupNames = "Demo";
export const restoreFromBackup = async (
  page: PageWIds,
  backupFileName?: typeof backupNames,
) => {
  const backupListItems = await page
    .getByTestId("BackupsControls.Completed")
    .locator(".SmartCard");
  await backupListItems.first().waitFor({ state: "visible" });
  const backupItem =
    backupFileName ?
      backupListItems.filter({ hasText: `Backup name${backupFileName}` })
    : backupListItems;
  await backupItem
    .getByRole("button", { name: "Restore...", exact: true })
    .click();
  await typeConfirmationCode(page);
  await page.getByRole("button", { name: "Restore", exact: true }).click();
};

export const getDashboardUtils = (page: PageWIds) => {
  const _open = openConnection.bind(null, page);
  const openMenuIfClosed = async (closeMenu = false) => {
    await page.waitForTimeout(1500);
    const menuContentButton = await page.getByTestId(
      "dashboard.menu.quickSearch",
    );
    const menuIsOpen = await menuContentButton.count();
    if (menuIsOpen) {
      if (closeMenu) {
        await page
          .getByTestId("DashboardMenu")
          .getByTestId("Popup.close")
          .click();
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

export const setPromptByText = async (page: PageWIds, text: string) => {
  await page.getByTestId("LLMChatOptions.Prompt").click();
  await page.locator(".SmartCard").getByText(text).first().click();
  await page
    .getByTestId("LLMChatOptions.Prompt")
    .getByTestId("Popup.close")
    .click();
};

export const setModelByText = async (page: PageWIds, text: string) => {
  await page.getByTestId("LLMChatOptions.Model").click();
  await page.waitForTimeout(500);
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1e3); // wait for model to be set
};

export const setupProstglesLLMProvider = async (page: PageWIds) => {
  const aiDemoDBName = "prostgles_video_demo" as const;
  await openConnection(page, "cloud");
  await openConnection(page, aiDemoDBName);
  await runDbsSql(page, "TRUNCATE llm_chats CASCADE");
  await runDbsSql(
    page,
    `
      DELETE FROM llm_credentials WHERE provider_id = 'Prostgles';
      UPDATE llm_providers 
      SET api_url = 'http://localhost:3004/rest-api/cloud/methods/askLLM'
      WHERE id = 'Prostgles';
      /*
        UPDATE published_methods
        SET connection_id = (
          SELECT id FROM connections WHERE "name" = '${aiDemoDBName}'
        )
        WHERE name = 'askLLM';
      */
     `,
  );
  const activeSession = await runDbsSql(
    page,
    `SELECT *
        FROM sessions
        WHERE user_id = (SELECT id FROM users WHERE username = 'test_user')
        AND active = true
        ORDER BY id_num DESC
        LIMIT 1`,
    {},
    { returnType: "rows" },
  );
  if (!activeSession.length) {
    throw new Error("No active session found for test_user");
  }
  await runDbsSql(
    page,
    `INSERT INTO llm_credentials(provider_id, api_key, user_id)
      VALUES('Prostgles', \${api_key} , \${user_id} )
      `,
    { api_key: btoa(activeSession[0].id), user_id: activeSession[0].user_id },
  );
};

/** Delete existing chat during local testing */
export const deleteExistingLLMChat = async (page: PageWIds) => {
  const optsToggle = page.getByTestId("LLMChatOptions.toggle");
  if ((await optsToggle.count()) === 0) {
    await page.getByTestId("AskLLM").click();
  }
  await page.getByTestId("LLMChatOptions.toggle").click();
  await page.getByTestId("SmartForm.delete").click();
  await page.getByTestId("SmartForm.delete.confirm").click();
  await page.waitForTimeout(1e3);
};

export const deleteAllWorkspaces = async (page: PageWIds): Promise<void> => {
  const list = await page.getByTestId("WorkspaceMenu.list");
  await list.waitFor({ state: "visible", timeout: 10e3 });
  await page.waitForTimeout(1500);
  const listTextContent = await list.textContent();
  if (listTextContent?.trim().toLowerCase() === "default") return; // only default workspace exists
  await page.getByTestId("WorkspaceMenuDropDown").click();
  await page.getByTestId("WorkspaceDeleteBtn").last().click();
  await page.getByTestId("WorkspaceDeleteBtn.Confirm").click();
  await page.waitForTimeout(555);
  await page.reload();
  return deleteAllWorkspaces(page);
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
