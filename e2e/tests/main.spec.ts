import { expect, test } from '@playwright/test';
import { authenticator } from "otplib";
import {
  PageWIds, TEST_DB_NAME, USERS, clickInsertRow, closeWorkspaceWindows,
  createAccessRule,
  createDatabase,
  disablePwdlessAdminAndCreateUser,
  dropConnectionAndDatabase,
  fileName,
  fillLoginFormAndSubmit,
  forEachLocator,
  getMonacoEditorBySelector,
  getSearchListItem,
  getTableWindow,
  goTo,
  insertRow,
  localNoAuthSetup, login, monacoType, openTable,
  queries,
  runDbSql,
  runDbsSql,
  runSql, selectAndInsertFile, setTableRule,
  setWspColLayout,
  typeConfirmationCode,
  uploadFile
} from './utils';

const DB_NAMES = {
  test: TEST_DB_NAME,
  food_delivery: "food_delivery",
  // sample_database: "sample_database",
  video_demo_database: "prostgles_video_demo",
}

test.describe.configure({ mode: "serial" });
test.describe("Main test", () => {
  
  if(process.env.ONLY_VIDEO){
    test.skip();
  }
  test.beforeEach(async ({ page }) => {
    
    page.on("console", console.log);
    page.on("pageerror",console.error);
    
    await page.waitForTimeout(200);
  });

  const deleteAllBackups = async (page: PageWIds) => {
    await page.getByTestId("config.bkp").click();
    await page.getByTestId("SmartCardList").waitFor({ state: "visible", timeout: 15e3 });
    const canDelete = await page.getByRole("button", { name: "Delete all..."});
    if(await canDelete.count()){
      await canDelete.click();
      await typeConfirmationCode(page);
      await page.getByRole("button", { name: "Force delete backups", exact: true }).click();
      await page.waitForTimeout(1e3);
    }
  }

  test('Can disable passwordless admin by creating a new admin user', async ({ page: p }) => {
    const page = p as PageWIds;

    await page.waitForTimeout(2000);

    if(!localNoAuthSetup) {
      await disablePwdlessAdminAndCreateUser(page);
    }
    await login(page);

    await page.getByRole('link', { name: 'Connections' }).click();
    
    /** State database exists */
    await page.getByRole("link", { name: "Prostgles UI state" }).waitFor({ state: "visible", timeout: 15e3 });
  });

  test("Limit login attempts", async ({ page: p, browser, context }) => {
    // const page = p as PageWIds;
    const page: PageWIds = await browser.newPage({ 
      extraHTTPHeaders: { 
        'x-real-ip': '1.1.1.1' 
      }
    });

    await login(page, USERS.test_user, "/login");
    await page.waitForTimeout(1500);
    await runDbsSql(page, `DELETE FROM login_attempts; UPDATE global_settings SET login_rate_limit = '{"groupBy": "x-real-ip", "maxAttemptsPerHour": 5}'`);
    await goTo(page, "/logout");
    await goTo(page, "/login");
    const loginAndExpectError = async (errorMessage: string, user: string, lpage: PageWIds) => {
      await lpage.waitForTimeout(1e3);
      await fillLoginFormAndSubmit(lpage, user);
      await lpage.getByTestId("Login.error").waitFor({ state: "visible", timeout: 15e3 });
      expect(await lpage.getByTestId("Login.error").textContent()).toContain(errorMessage);
    }
    for(let i = 0; i < 5; i++){
      await loginAndExpectError("Provided credentials are not correct", "invalid", page);
    }
    await loginAndExpectError("Too many failed ", "invalid", page);
    await loginAndExpectError("Too many failed ", USERS.default_user, page);

    /** TODO: finish cookie rate test after playwright ws headers fix 
     * https://github.com/microsoft/playwright/issues/28948
    */
    // const newPageC: PageWIds = await browser.newPage({ 
    //   extraHTTPHeaders: { 
    //     'x-real-ip': '1.1.1.2' 
    //   }
    // });
    // await login(newPageC, USERS.test_user, "/");
    // await newPageC.waitForTimeout(1e3);
    // await newPageC.getByRole('link', { name: 'Connections' }).click();
    // await goTo(newPageC, "/logout");
    // for(let i = 0; i < 5; i++){
    //   const newPageCc: PageWIds = await browser.newPage({ 
    //     extraHTTPHeaders: { 
    //       'x-real-ip': '1.1.1.22' 
    //     },
    //     storageState: {
    //       cookies: [
    //         { name: 'sid_token', value: "random"+i, path: "/", domain: "localhost", httpOnly: true, sameSite: "Lax", expires: Math.round((Date.now() + 36e4)/1e3), secure: false }
    //       ],
    //       origins: []
    //     }
    //   });
    //   // await newPageCc.context().addCookies([
    //   //   { name: 'sid_token', value: "random"+i, path: "/", domain: "localhost", httpOnly: true, sameSite: "Lax" }
    //   // ]);
    //   await goTo(newPageCc, "/");
    //   await newPageCc.waitForTimeout(1e3);
    //   await newPageCc.close();
    // }
    // await loginAndExpectError("Too many failed attempts", USERS.default_user, newPageC);

    /** Revert */
    const newPage: PageWIds = await browser.newPage({ 
      extraHTTPHeaders: { 
        'x-real-ip': '1.1.1.3' 
      }
    });
    await login(newPage, USERS.test_user, "/login");
    await newPage.waitForTimeout(1500);
    await runDbsSql(newPage, `DELETE FROM login_attempts; UPDATE global_settings SET login_rate_limit = '{"groupBy": "ip", "maxAttemptsPerHour": 5}'`);
  });

  test('Create db with owner', async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page);
    const dbName = "db_with_owner";
    await createDatabase(dbName, page, false, { name: dbName, pass: dbName });
    const currUser = await runDbSql(page, `SELECT current_user`, {}, { returnType: "value" });
    expect(currUser).toEqual(dbName);

    /** Ensure realtime works and is resilient to schema change */
    const createTableQuery = `CREATE TABLE "table_name" ( id SERIAL PRIMARY KEY, title  VARCHAR(250), gencol TEXT GENERATED ALWAYS AS ( title || id::TEXT) stored);`
    await runDbSql(page, createTableQuery);
    await page.getByTestId("dashboard.menu.tablesSearchList").locator(`[data-key="table_name"]`).click();
    await page.locator(`[role="columnheader"]`).nth(1).click();
    await page.locator(`[role="columnheader"]`).nth(1).click();

    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await page.getByText("my_new_value_1").waitFor({ state: "visible", timeout: 15e3 });


    await runDbSql(page, `DROP TABLE table_name;`);
    await page.getByTestId("W_Table.TableNotFound").waitFor({ state: "visible", timeout: 15e3 });

    await runDbSql(page, createTableQuery);
    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await runDbSql(page, `INSERT INTO table_name (title) VALUES('my_new_value_')`);
    await page.getByText("my_new_value_1").waitFor({ state: "visible", timeout: 15e3 });
    await page.getByText("my_new_value_3").waitFor({ state: "visible", timeout: 15e3 });
    await page.waitForTimeout(4e3);

    /** Test schema select */
    await runDbSql(page, `
      CREATE SCHEMA "MySchema";
      CREATE TABLE "MySchema"."MyTable" (
        "MyColumn" TEXT
      );
    `);
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("MoreOptionsToggle").click();
    await page.getByTestId("SchemaFilter").click();
    await page.getByTestId("SchemaFilter").locator(`[data-key="MySchema"]`).click();
    await page.keyboard.press("Escape");
    await page.getByTestId("Connection.edit.updateOrCreateConfirm").click();
    await page.getByTestId("dashboard.menu.tablesSearchList").locator(`[data-key=${JSON.stringify(`"MySchema"."MyTable"`)}]`).click();
    await insertRow(page, `"MySchema"."MyTable"`, { MyColumn: "some value" });
    await page.getByText("some value").waitFor({ state: "visible", timeout: 15e3 });
    
    
    await goTo(page, 'localhost:3004/connections');
    await page.waitForTimeout(4e3);
    await dropConnectionAndDatabase(dbName, page);
    await page.waitForTimeout(4e3);
    await runDbsSql(page, `DROP USER db_with_owner;`);
  });

  test('Login returnUrl', async ({ page: p }) => {
    const page = p as PageWIds;
    const requestedUrl = 'http://localhost:3004/connections/some-connection?a=b';
    await login(page, undefined, requestedUrl);
    await page.getByTestId("ProjectConnection.error").waitFor({ state: "visible", timeout: 15e3 });
    const currentUrl = await page.url();
    expect(currentUrl).toEqual(requestedUrl);
  });

  test('Open redirect returnUrl', async ({ page: p }) => {
    const page = p as PageWIds;
    const requestedUrl = 'http://localhost:3004/login?returnURL=/%2F%2Fwikipedia.org';
    await login(page, undefined, requestedUrl);
    await goTo(page, requestedUrl);
    await goTo(page, requestedUrl);
    const currentUrl = await page.url();
    expect(currentUrl.startsWith("http://localhost:3004/")).toBe(true);
  });

  test('Test 2FA', async ({ page: p }) => {
    const page = p as PageWIds;
 
    await login(page);
 
    await page.getByRole('link', { name: "test_user" }).click();
    await page.getByTestId("MenuList").locator(`[data-key="security"]`).click();
    await page.getByTestId("Setup2FA.Enable").click();
    await page.getByTestId("Setup2FA.Enable.GenerateQR").click();
    await page.getByTestId("Setup2FA.Enable.CantScanQR").click();
    const Base64Secret = (await page.getByTestId("Setup2FA.Enable.Base64Secret").textContent())?.split(" ").at(-1);
    const recoveryCode = await page.locator("#totp_recovery_code").textContent();
    const code = authenticator.generate(Base64Secret ?? "");
    await page.getByTestId("Setup2FA.Enable.ConfirmCode").locator("input").fill(code);
    await page.getByTestId("Setup2FA.Enable.Confirm").click();

    /** Using token */
    await login(page);
    const newCode = authenticator.generate(Base64Secret ?? "");
    await page.locator("#totp_token").fill(newCode);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('link', { name: 'Connections' }).waitFor({ state: "visible", timeout: 15e3 });

    /** Using recovery code */
    await goTo(page, 'localhost:3004/logout');
    await login(page);
    await page.getByRole('button', { name: 'Enter recovery code', exact: true }).click();
    await page.locator("#totp_recovery_code").fill(recoveryCode ?? "");
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForTimeout(3e3);
    await page.getByRole('link', { name: 'Connections' }).waitFor({ state: "visible", timeout: 15e3 });

    await page.getByRole('link', { name: "test_user" }).click();
    await page.getByTestId("MenuList").locator(`[data-key="security"]`).click();
    await page.getByTestId("Setup2FA.Disable").click();
  });

  test('Sample database backups', async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page);

    /** Create Sample database */
    await createDatabase("sample_database", page, false);
    
    await page.getByTestId("dashboard.goToConnConfig").waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.details").click(); 
    await page.getByTestId("config.status").click(); 
    await page.getByTestId("config.ac").click(); 
    await page.getByTestId("config.methods").click(); 
    await page.getByTestId("config.files").click(); 
    await page.getByTestId("config.bkp").click(); 
    await page.getByTestId("config.api").click(); 


    await page.getByTestId('config.bkp').click();
    /** Delete previous backups (when testing locally) */
    await deleteAllBackups(page);

    /** Test automatic backups */
    const toggleAutomaticBackups = async () => {
      await page.getByTestId("config.bkp.AutomaticBackups").click();
      await page.getByTestId("config.bkp.AutomaticBackups.toggle").click({ timeout: 5e3 });
      await page.waitForTimeout(1e3);
      /** If it was enabled already enabled then re-enable it */
      const text = await page.getByTestId("config.bkp.AutomaticBackups").textContent();
      if(text?.includes("Enable automatic")){
        await toggleAutomaticBackups();
      }
    }
    await toggleAutomaticBackups();
    await page.getByRole('button', { name: 'Restore...', exact: true }).waitFor({ state: "visible", timeout: 15e3 });
    await deleteAllBackups(page);

    /** Disable automatic backups */
    await toggleAutomaticBackups();
  });

  test('Delete previous users and data (to improve local tests)', async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page);
    /** Delete previous user */
    await page.goto('localhost:3004/users', { waitUntil: "networkidle" });
    for await (const username of [USERS.default_user, USERS.public_user]){
      await page.locator(`#search-all`).fill(username);
      await page.waitForTimeout(1e3);
      // await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1e3);
      await forEachLocator(
        page,
        async () => page.getByTestId("dashboard.window.viewEditRow"), 
        async (editBtn) => {
          await editBtn.click();
          await page.getByTestId("SmartForm.delete").click();
          await page.getByTestId("SmartForm.delete.confirm").click();
          await page.waitForTimeout(1e3);
        }
      );
      await page.reload();
      await page.waitForTimeout(1e3);
    }
    
    await page.goto('localhost:3004/account', { waitUntil: "networkidle" });
    await monacoType(page, `[data-label="Options"]`, `{ `);
    await page.keyboard.type("vst", { delay: 100 });
    await page.keyboard.press("Tab");
    await page.keyboard.type("fa", { delay: 100 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    const monacoEditor = await getMonacoEditorBySelector(page, `[data-label="Options"]`);
    const text = await monacoEditor.innerText();
    /** Space charCode=32 but here we get 160 */
    if(!text.includes(`"viewedSQLTips":${String.fromCharCode(160)}false`)){
      throw `Expected "viewedSQLTips": false in ${text}`
    }
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page.getByRole("button", { name: "Update row!", exact: true }).click();
    await page.getByRole("link", { name: "Connections", exact: true }).click();
    await page.waitForTimeout(1e3);
    const existingTestConn = await page.getByRole("link", { name: TEST_DB_NAME, exact: true });
    if(await existingTestConn.isVisible()){
      await dropConnectionAndDatabase(TEST_DB_NAME, page)
    }
    await page.waitForTimeout(1200);
    for(const dbName of Object.values(DB_NAMES)){
      await runDbsSql(page, `DROP DATABASE IF EXISTS ${JSON.stringify(dbName)}`);
    }
  });

  test('Create and prepare test database', async ({ page: p }) => {
    const page = p as PageWIds;
  
    await login(page);
    await page.getByRole("link", { name: "Connections", exact: true }).click();
    await createDatabase(TEST_DB_NAME, page);
    await page.getByTestId("dashboard.menu.sqlEditor").waitFor({ state: "visible", timeout: 15e3 })
    const editors = await page.locator(".ProstglesSQL").count();
    if(!editors){
      await page.getByTestId("dashboard.menu.sqlEditor").click();
    }
    if(editors > 1){
      throw "Not ok"
    }
    await page.getByRole("button", { name: "Ok, don't show again", exact: true }).click();

    /** Test sql key bindings */
    await page.keyboard.press("Alt+KeyE");
    const keybindings = [
      'Alt+KeyE',
      'Control+KeyE',
      'Control+Enter',
      'F5',
    ];
    for await(const key of keybindings){
      const text = `hello${key}`;
      await monacoType(page, `.ProstglesSQL`, `SELECT '${text}'`);
      await page.keyboard.press(key);
      await page.locator('.W_SQLResults').getByText(text, { exact: true }).waitFor({ state: "visible", timeout: 5e3 });
    }
    await monacoType(page, `.ProstglesSQL`, `SELECT pg_sleep(22)`);
    await page.keyboard.press('Alt+KeyE');
    await page.waitForTimeout(2e3);
    await page.keyboard.press('Escape');
    await page.locator('.W_SQLBottomBar .ErrorComponent').getByText("canceling statement due to user request", { exact: true }).waitFor({ state: "visible", timeout: 5e3 });

    /** Create schema */
    await runSql(page, queries.orders);
    await page.waitForTimeout(1e3);
    await page.getByTestId("dashboard.menu.tablesSearchList")
      .locator(`[data-key=${JSON.stringify("orders")}]`)
      .waitFor({ state: "visible", timeout: 5e3 })
    await closeWorkspaceWindows(page);

    /** Enable file storage */
    await page.getByTestId("dashboard.goToConnConfig").waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click(); 
    await page.getByTestId("config.files.toggle").click(); 
    await page.getByTestId("config.files.toggle.confirm").click(); 
    await page.getByTestId("config.goToConnDashboard").click();

    /** Create table */
    await page.getByTestId("dashboard.menu.createTable").click();
    await page.getByText("Create table").click();
    await page.getByTestId("dashboard.menu.createTable.tableName").getByRole("textbox").type("my_table");
    const addColumn = async (colName: string, dataType: string, isPkey?: boolean) => {
      await page.getByTestId("dashboard.menu.createTable.addColumn").click();
      const colEditor = await page.getByTestId("ColumnEditor.name");
      await colEditor.getByRole("textbox").fill(colName);
      await page.getByTestId("ColumnEditor.dataType").waitFor({ state: "visible" }); 
      await page.keyboard.press('Tab');
      await page.keyboard.type(dataType, { delay: 300 });
      await page.keyboard.press("Enter");
      if(isPkey){
        await page.getByText("Primary key").click();
      }
      await page.getByTestId("dashboard.menu.createTable.addColumn.confirm").click();
    }
    await addColumn("id", "ser", true);
    await addColumn("name", "text");
    await addColumn("content", "text");
    await addColumn("secret", "text");

    /** Add icon field */
    await page.getByTestId("dashboard.menu.createTable.addColumn").click();
    await page.getByTestId("AddColumnReference").click();
    await page.getByTestId("SearchList.List").locator(`[data-key="files.id"]`).click();
    await page.getByTestId("dashboard.menu.createTable.addColumn.confirm").click();
    
    /** Create table */
    await page.getByTestId("dashboard.menu.createTable.confirm").click();
    await page.getByTestId("SQLSmartEditor.Run").click();

    /** Insert records into new table */
    await page.getByRole("listitem").getByText("my_table").click({ delay: 200 });
    await insertRow(page, "my_table", { name: "some text" });
    const deletedRowName = "some more text"
    await insertRow(page, "my_table", { name: deletedRowName });

    /** Search row */
    await page.getByTestId("dashboard.window.toggleFilterBar").click(); // { force: true }
    await page.locator("input#search-all").fill("2");
    await page.getByRole('listitem', { name: '2' }).click();
    /** This should work as well!!! */
    // await page.keyboard.press("ArrowDown", { delay: 300 });
    // await page.keyboard.press("Enter", { delay: 300 });
    
    /** Backup db */
    await page.getByTestId("dashboard.goToConnConfig").waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId('config.bkp').click();
    await page.getByRole('button', { name: 'Create backup', exact: true }).click();
    await page.getByRole('button', { name: 'Start backup', exact: true }).click();
    await page.getByText("Completed");

    /** Delete row */
    await page.getByTestId("config.goToConnDashboard").click();
    await page.getByTestId("dashboard.window.viewEditRow").click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete!', exact: true }).click();
    await page.waitForTimeout(200);

    /** Restore db */
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId('config.bkp').click();
    await page.getByRole('button', { name: 'Restore...', exact: true }).click();
    await typeConfirmationCode(page);
    await page.getByRole('button', { name: 'Restore', exact: true }).click();

    /** Go to dashboard. Deleted row should be there */
    await page.waitForTimeout(2200);
    await page.getByTestId("config.goToConnDashboard").click();
    await page.getByText(deletedRowName).waitFor({ state: "visible", timeout: 15e3});
    await page.waitForTimeout(1200);

    /** SearchAll for that row as well */
    await page.keyboard.press("Control+Shift+KeyF");
    await page.getByTestId("SearchAll").fill(deletedRowName);
    await page.waitForTimeout(1100);
    await page.getByText(`name: ${deletedRowName}`).waitFor({ state: "visible", timeout: 15e3 });
    await page.keyboard.press("Escape");

    /** Test Access control */
    await page.goto("localhost:3004/users", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await insertRow(page, "users", { username: USERS.default_user, password: USERS.default_user }, true);
    await insertRow(page, "users", { username: USERS.default_user1, password: USERS.default_user1 }, true);
    // await insertRow(page, "users", { username: USERS.public_user, password: USERS.public_user, type: "public" }, true);
  });

  test('Set access rules', async ({ page: p }) => {
    const page = p as PageWIds;

    await createAccessRule(page, "default");

    await setTableRule(page, "my_table", { 
      select: { excludedFields: ["secret"] },
      insert: { forcedData: { name: "abc" }, excludedFields: ["secret"] },
      update: { forcedData: { name: "abc" }, excludedFields: ["secret"] },
      delete: { forcedFilter: [{ fieldName: "name", value: "abc" }] },
    }, false);
    await setTableRule(page, "orders", { select: { }, update: {}, insert: {}, delete: {} }, false);
    await setTableRule(page, "files", { select: { }, update: {}, insert: {}, delete: {} }, true);

    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  test('Default user has correct permissions', async ({ page: p }) => {
    const page = p as PageWIds;

    await goTo(page, 'localhost:3004/logout');
    await login(page, USERS.default_user);
    
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();
    await page.waitForTimeout(1000);
    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    await setWspColLayout(page);
    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "fil");
    await page.waitForTimeout(1000);

    await uploadFile(page);

    await insertRow(page, "my_table", { content: USERS.default_user });
    await insertRow(page, "orders", { status: "incomplete" });
    await expect(await page.getByText("secret").count()).toBe(0);
  });

  test('Default user1 has correct permissions', async ({ page: p }) => {
    const page = p as PageWIds; 

    await goTo(page, 'localhost:3004/logout');
    await login(page, USERS.default_user1);
    
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();
    await page.waitForTimeout(1000);
    await setWspColLayout(page);

    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "fil");
    await page.waitForTimeout(1000);

    await uploadFile(page);

    await insertRow(page, "my_table", { content: USERS.default_user1 });
    await insertRow(page, "orders", { status: "incomplete" });
    await expect(await page.getByText("secret").count()).toBe(0);
  });

  test('Admin user (test_user) can see all data', async ({ page: p }) => {
    const page = p as PageWIds;
    
    await goTo(page, 'localhost:3004/logout');
    await login(page, USERS.test_user);
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();

    await setWspColLayout(page);
    await page.waitForTimeout(1e3);

    await closeWorkspaceWindows(page);

    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "file");
    
    await expect(await page.getByText("abc", { exact: true }).count()).toBe(2);
    await expect(await page.getByText("incomplete").count()).toBe(2);
    await expect(await page.getByText("secret").count()).toBe(1);
    await expect(await page.getByText(fileName).count()).toBe(2);
  
    /** Disable files permissions to test direct insert */
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.ac").click();
    await page.locator(`.ExistingAccessRules_Item`).click();
    await setTableRule(page, "files", { select: { }, update: {}, insert: {}, delete: {} }, true);
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  test("User can insert and view files through allowed reference columns", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page, USERS.default_user);
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();
    await page.waitForTimeout(1e3);
    await clickInsertRow(page, "my_table");
    await selectAndInsertFile(page, page => page.getByTestId("SmartFormFieldOptions.AttachFile").click());
    await page.waitForTimeout(3e3);
    const nodes = await page.getByText(fileName).innerHTML();
    console.log({ nodes });
    await expect(await page.getByText(fileName).count()).toBe(1);
    await page.waitForTimeout(1e3);
  });

  test("Table tests", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();

    const wspName = "Table tests"
    /** Delete existing duplicate workspace */
    await page.getByTestId("WorkspaceMenuDropDown").click();
    await page.waitForTimeout(1e3);
    let deleted = false;
    await forEachLocator(
      page,
      async () => {
        //.getByText("WorkspaceMenu.SearchList")
        const res = await page.getByTestId("WorkspaceMenu.SearchList").locator(`[data-key=${JSON.stringify(wspName)}]`);
        return res;
      },
      async (item) => {
        const deleteWspBtn = await item.getByTestId("WorkspaceDeleteBtn")
        deleted = true;
        await deleteWspBtn.click();
        await page.waitForTimeout(555);
        await page.getByTestId("WorkspaceDeleteBtn.Confirm").click();
        await page.waitForTimeout(555);
      },
    );
    if(!deleted){
      await page.locator(`[data-close-popup="true"]`).click();
    }
    await page.getByTestId("WorkspaceMenuDropDown").click();
    await page.getByTestId("WorkspaceMenuDropDown.WorkspaceAddBtn").click();
    await page.waitForTimeout(1e3);
    await page.keyboard.insertText(wspName);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1e3);
    await setWspColLayout(page);

    const query = `
      CREATE EXTENSION IF NOT EXISTS postgis;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE users (id UUID  PRIMARY KEY, first_name text, last_name text, email text, created_at timestamp default now(), type TEXT DEFAULT 'default', position numeric);
      ${queries.orders}
      ALTER TABLE orders 
      ADD COLUMN total_cost NUMERIC NOT NULL DEFAULT random() * 100;
      ALTER TABLE orders ADD COLUMN delivery_address GEOGRAPHY DEFAULT st_point(-0.08 + random()/10, 51.5 + random()/10)::GEOGRAPHY;
      ALTER TABLE orders
      ADD COLUMN created_at timestamp default now() + (random() * 10 * '1day'::interval);
      ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users;
      INSERT INTO users (id, first_name, last_name, email, type, position)
      SELECT 
        user_id, 
        "left"(user_id::TEXT, 8), 
        "right"(user_id::TEXT, 8), 
        "left"(user_id::TEXT, 8) || "right"(user_id::TEXT, 8) || '@gmail.com',  
        CASE WHEN rownumid = 1 THEN 'default' WHEN rownumid = 2 THEN 'admin' WHEN random() < .5 THEN 'default' ELSE 'admin' END, 
        row_number() over()
      FROM (
        SELECT *, row_number() over( PARTITION BY user_id) as dpid, row_number() over() as rownumid
        FROM (
          SELECT rownum, gen_random_uuid() as user_id
          FROM generate_series(1, 1e2) as rownum
        ) t
      ) t1
      WHERE dpid = 1;
      
      INSERT INTO orders (user_id, status)
      SELECT u.id, 'completed'
      FROM (
        SELECT rownum 
        FROM generate_series(1, 1e2) as rownum
      ) t
      LEFT JOIN users u ON true;
      `;
    await page.evaluate(async (query) => {
      try {

        await (window as any).db.sql(query)
      } catch(err){
        document.body.innerText = JSON.stringify(err);
      }
    }, query);

    await getSearchListItem(page,{ dataKey: "users" }).click();
    const usersTable = await getTableWindow(page, "users");
    await usersTable.getByTestId("AddColumnMenu").click();
    await getSearchListItem(page.getByTestId("AddColumnMenu"), { dataKey: "Referenced" }).click();
    await page.getByTestId("JoinPathSelectorV2").click();
    await page.waitForTimeout(1e3)
    await getSearchListItem(page.getByTestId("JoinPathSelectorV2"), { dataKey: "orders" }).click();
    await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
    await page.waitForTimeout(1e3)
    await getSearchListItem(page, { dataKey: "total_cost" }).getByTestId("SummariseColumn.toggle").click()
    await page.waitForTimeout(1e3);
    await getSearchListItem(page.getByTestId("FunctionSelector"), { dataKey: "$sum" }).click();
    await page.getByTestId("SummariseColumn.apply").click();;
    await page.getByTestId("LinkedColumn.ColumnListMenu").getByTestId("Popup.close").click();;
    await page.getByTestId("LinkedColumn.Add").click();

    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddChartMenu.Map").click();
    await page.getByTestId("AddChartMenu.Map").getByRole('listitem').filter({ hasText: '> orders (delivery_address)' }).click();
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();
    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddChartMenu.Timechart").click();
    await page.getByTestId("AddChartMenu.Timechart").getByRole('listitem').getByText("> orders (created_at)", { exact: true }).click();
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();

    await page.waitForTimeout(5e3);
    /** Mouse move is needed to show tooltip and to trigger re-render so that _renderedData.x,y are defined */
    await page.mouse.move(700, 111);
    await page.mouse.move(700, 150);
    await page.mouse.click(700, 150);
    await page.getByTestId("W_TimeChart.ActiveRow").waitFor({ state: "visible", timeout: 5e3 });
    /** Test W_TimeChart activeRow crossfilter */
    const { data = [], x = -99, y = -99 } = await page.evaluate(async () => {
      try {
        const timeChartRef = document.querySelector(".W_TimeChart")!;
        const bbox = timeChartRef.getBoundingClientRect();
        const data = (timeChartRef as any)._renderedData as { x: number; y: number; value: number; }[];
        return { data, x: bbox.x, y: bbox.y };
        
      } catch(err: any){
        document.body.innerText = err.toString() + JSON.stringify(err);
        return {}
      }
    });
    const [firstPoint, secondPoint] = data;
    if(typeof firstPoint?.x !== "number" || typeof secondPoint?.x !== "number"){
      console.error("firstPoint or secondPoint missing:", { firstPoint, secondPoint })
    } else {
      await page.mouse.click(firstPoint.x + x, firstPoint.y + y);
      await page.waitForTimeout(1e3);
      await page.mouse.click(firstPoint.x + x, firstPoint.y + y); // to close it
      await page.waitForTimeout(1e3);
      await page.mouse.click(secondPoint.x + x, secondPoint.y + y);
      await page.waitForTimeout(1e3);
    }

    // Close active row
    await page.waitForTimeout(2e3);
    const brush = await page.getByTestId("W_TimeChart.ActiveRow");
    if(await brush.isVisible()){
      await brush.locator("button").click();
    }

    /**
     * Ensure card view works
     */
    await usersTable.getByTestId("dashboard.window.menu").click();
    await page.waitForTimeout(1e3);
    await page.getByText("Display options").click();
    await page.getByTestId("table.options.displayMode").click();
    await page.getByTestId("SearchList.List").locator(`[data-key="card"]`).click();
    await page.getByTestId("table.options.cardView.groupBy").click();
    await page.getByTestId("SearchList.List").locator(`[data-key="type"]`).click();
    await page.getByTestId("table.options.cardView.orderBy").click();
    await page.getByTestId("SearchList.List").locator(`[data-key="position"]`).click();
    await page.waitForTimeout(1e3);
    await page.keyboard.press("Escape");
    await usersTable.getByTestId("dashboard.window.fullscreen").click();
    await page.waitForTimeout(3e3);
    await expect(await page.getByText("first_name").first()).toBeVisible();

    /** Test groupBy */
    const swapFirstTwoRows = async () => {

      const groups = await page.getByTestId("CardView.group").all();
      await expect(groups.length).toBe(2);
      const [firstGroup, secondGroup] = groups;
      await page.waitForTimeout(2e3);
      const firstGroupFirstRow = await firstGroup.getByTestId("CardView.row").first(); 
      const secondGroupFirstRow = await secondGroup.getByTestId("CardView.row").first();  
      const draggedText = await firstGroupFirstRow.getByTitle("id").textContent();
      const targetText = await secondGroupFirstRow.getByTitle("id").textContent();
      const firstDragHandle = await firstGroupFirstRow.getByTestId("CardView.DragHeader");
      const secondDragHandle = await secondGroupFirstRow.getByTestId("CardView.DragHeader");
  
      const box1 = await firstDragHandle.boundingBox();
      const box2 = await secondDragHandle.boundingBox();
      if(!box1 || !box2){
        throw "box1 or box2 missing";
      }
      await page.mouse.move(box1.x + box1.width/2, box1.y + box1.height/2, { steps: 22 });
      await firstDragHandle.hover();
      await page.waitForTimeout(1e3);
      await page.mouse.down({ button: "left" });
      await page.mouse.move(box2.x + box2.width/2, box2.y + box2.height/2, { steps: 111 });
      await page.mouse.up({ button: "left" });
      await page.waitForTimeout(5e3);
   
      const newTargetText = await secondGroup.getByTestId("CardView.row").first().getByTitle("id").textContent(); 
      console.log({ draggedText, newTargetText })
      return { draggedText, newTargetText };
    }
    
    await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    const { draggedText, newTargetText } = await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    expect(draggedText).toEqual(newTargetText);
    await page.waitForTimeout(2e3);

  });

  test("API tests", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();
    await page.getByTestId("dashboard.goToConnConfig").waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.api").click();

    await page.getByRole("button", { name: "Create token", exact: true  }).click();
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await page.getByTestId("Popup.close").click();
    await page.getByRole("button", { name: "Examples", exact: true }).click();
    await page.getByRole("button", { name: "Download code sample", exact: true }).click();
  });


  test('SQL Autocomplete', async ({ page: p }) => {
    const page = p as PageWIds;
    const sqlTestTimeout = { total: 8 * 6e4, sql: 7 * 6e4 };
    test.setTimeout(sqlTestTimeout.total);
    
    await goTo(page, 'localhost:3004/logout');
    await login(page, USERS.test_user);
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();

    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    await page.waitForTimeout(3000);

    /** Ensure SQL Autocomplete works */
    await closeWorkspaceWindows(page);
    await page.getByTestId("dashboard.menu.sqlEditor").click();
    await page.getByTestId("dashboard.window.menu").click();
    await page.getByText("General").click();
    await page.getByText("DEMO").click();
    await page.waitForTimeout(100);
    await page.getByText("DEMO").click();
    await page.waitForTimeout(100);
    await page.getByText("DEMO").click();
    await page.waitForTimeout(100);
    await page.getByText("DEMO").click();
    await page.waitForTimeout(100);
    await page.getByText("DEMO").click();
    await page.waitForTimeout(100);

    const startSqlTest = async () => new Promise(async (resolve, reject) => {
      page.on('dialog', dialog => {
        const msg = dialog.message()
        console.log("1", msg);
        if(msg.includes("does not match the expected")){
          reject(msg);
          throw msg;
        }
        if(msg === "Demo finished successfully"){
          return resolve(1);
        }
        return dialog.accept();
      });

    });
    await monacoType(page, `.ProstglesSQL`, " ");
    await startSqlTest();
  });

  test("Admin can create and drop connections", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    const dbName = "my_new_db";
    await createDatabase(dbName, page);
    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    await page.goBack();
  
    const { connectionSelector } = await dropConnectionAndDatabase(dbName, page);
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    const deletedConnection =  await page.locator(connectionSelector);
    expect(await deletedConnection.count()).toEqual(0);
  });

  test('Set public user access rules', async ({ page: p }) => {
    const page = p as PageWIds; 
    
    await createAccessRule(page, "public");
    await setTableRule(page, "my_table", { 
      select: { },
    }, false);
    await setTableRule(page, "orders", { select: { }, update: {}, insert: {}, delete: {} }, false);
    await setTableRule(page, "files", { select: { }, update: {}, insert: {}, delete: {} }, true);
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  
  });
  test('Public user can access all allowed sections without issues', async ({ page: p }) => {
    const page = p as PageWIds;
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    await page.getByRole('link', { name: 'Connections' }).click();
    await page.getByRole('link', { name: TEST_DB_NAME }).click();
    await page.getByTestId("dashboard.menu.tablesSearchList").waitFor({ state: "visible", timeout: 10e3 });
    await openTable(page, "my_tabl");
  });
});