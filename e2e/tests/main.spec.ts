import { chromium, expect, test, type Locator } from "@playwright/test";
import { authenticator } from "otplib";
import { speechToTextTest } from "testAskLLM/speechToTextTest";

import { spawn } from "child_process";
import { fileBrowserGoToPath } from "fileBrowserGoToPath";
import { writeFileSync } from "fs";
import { mkdir } from "fs/promises";
import { join, resolve } from "path";
import {
  localNoAuthSetup,
  QUERIES,
  TEST_DB_NAME,
  USERS,
} from "utils/constants";
import { goTo } from "utils/goTo";
import { isPortFree } from "utils/isPortFree";
import { startMockSMTPServer } from "./mockSMTPServer";
import { testAskLLMCode, setupAskLLMToolUse } from "./testAskLLM/testAskLLM";
import { getCommandElemSelector, getDataKey, getDataLabel } from "./Testing";
import {
  clickAndWait,
  clickInsertRow,
  closeWorkspaceWindows,
  createAccessRule,
  createAccessRuleForTestDB,
  createDatabase,
  deleteExistingLLMChat,
  disablePwdlessAdminAndCreateUser,
  dropConnectionAndDatabase,
  enableAskLLM,
  enableMCPServers,
  fileName,
  fillLoginFormAndSubmit,
  fillSmartForm,
  forEachLocator,
  getAskLLMLastMessage,
  getLLMResponses,
  getMonacoEditorBySelector,
  getMonacoValue,
  getSearchListItem,
  getSelector,
  getTableWindow,
  insertRow,
  login,
  loginWhenSignupIsEnabled,
  monacoType,
  newChat,
  openConnection,
  openTable,
  PageWIds,
  restoreFromBackup,
  runDbsMethod,
  runDbSql,
  runDbsSql,
  runSql,
  selectAndUpsertFile,
  sendAskLLMMessage,
  setModelByText,
  setPromptByText,
  setTableRule,
  setupMagicLinkAuth,
  setWspColLayout,
  toggleMCPTools,
  typeConfirmationCode,
  uploadFile,
} from "./utils/utils";

const schemaGraphTestDbName = "financial.sql";
const DB_NAMES = {
  test: TEST_DB_NAME,
  food_delivery: "food_delivery",
  // sample_database: "sample_database",
  video_demo_database: "prostgles_video_demo",
};
const backupDir = resolve(__dirname, "../demo/backups");

test.describe.configure({ mode: "serial" });
test.describe("Main test", () => {
  if (process.env.ONLY_VIDEO) {
    test.skip();
  }
  let getEmails: () => any[];

  test.beforeAll(async () => {
    ({ getEmails } = startMockSMTPServer());
    console.log("getEmails", getEmails());
    return { getEmails };
  });

  test.beforeEach(async ({ page, browser }, testInfo) => {
    page.on("console", console.log);
    page.on("pageerror", console.error);
    await page.waitForTimeout(200);

    if (testInfo.title.includes("[no-backup]")) return;

    // Do auth + backup/restore in an isolated helper context
    const helperContext = await browser.newContext();
    const helperPage = (await helperContext.newPage()) as PageWIds;

    await login(helperPage, USERS.test_user, "/login");
    const backupName = testInfo.title;

    const restoreCount = await runDbsMethod(helperPage, "restoreConnections", {
      backupName,
    });

    if (!restoreCount) {
      await runDbsMethod(helperPage, "backupConnections", {
        name: backupName,
        allActive: true,
      });
    }
    await helperPage.request.post("/logout").catch(() => {});
    await helperContext.close();
  });

  const deleteAllBackups = async (page: PageWIds) => {
    await page.getByTestId("config.bkp").click();
    await page
      .getByTestId("BackupsControls.Completed")
      .waitFor({ state: "visible", timeout: 15e3 });
    const canDelete = await page.getByRole("button", { name: "Delete all..." });
    if (await canDelete.count()) {
      await canDelete.click();
      await typeConfirmationCode(page);
      await page
        .getByRole("button", { name: "Force delete backups", exact: true })
        .click();
      await page.waitForTimeout(1e3);
    }
  };

  test("port 3089 must be available for mcpsandbox test [no-backup]", async () => {
    const free = await isPortFree(3089);
    await expect(free).toBe(true);
  });

  test("Connecting with an existing sid to a fresh instance will ignore the sid IF passwordless admin did not claim a session yet [no-backup]", async ({
    page: p,
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const page = p as PageWIds;
    const url = new URL("http://localhost:3004");
    await page.context().addCookies([
      {
        name: "sid_token",
        value: "1random-sid",
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        secure: url.protocol.startsWith("https"),
        sameSite: "Lax",
      },
    ]);

    await goTo(page);

    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: "Prostgles UI state" }).click();
    await page.getByTestId("Feedback").waitFor({ state: "visible" });

    const browser2 = await chromium.launch();
    const newPage = await browser2.newPage();

    await newPage.context().addCookies([
      {
        name: "sid_token",
        value: "2random-sid",
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        secure: url.protocol.startsWith("https"),
        sameSite: "Lax",
      },
    ]);
    await goTo(newPage);
    await expect(await newPage.textContent("body")).toContain(
      "Only 1 session is allowed for the passwordless admin",
    );
    await browser2.close();
    await newPage.close();

    await runDbsSql(
      page,
      `
      DELETE FROM magic_links; 
      DELETE FROM sessions; 
      DELETE FROM login_attempts`,
    ).catch(async (e) => {
      if (e && e.code === "40P01") {
        const info = await runDbsSql(
          page,
          `-- Get detailed information about locks on the specific relations
          SELECT 
            pid,
            sa.usename,
            sa.application_name,
            sa.client_addr,
            sa.query_start,
            sa.state,
            sa.query
          FROM pg_stat_activity sa WHERE query <> ''`,
          {},
          { returnType: "rows" },
        );
        console.error("Deadlock detected:", info);
      }
      return Promise.reject(e);
    });
  });

  test("Can disable passwordless admin by creating a new admin user. User data is reassigned and accessible to the new user [no-backup]", async ({
    page: p,
  }) => {
    const page = p as PageWIds;

    const goToWorkspace = async (openUsersTable = true) => {
      await page
        .getByRole("link", { name: "Connections" })
        .click({ timeout: 6e3 });
      await page.getByRole("link", { name: "Prostgles UI state" }).click();
      if (openUsersTable) {
        await openTable(page, "users");
      }
      await page
        .getByTestId("dashboard.window.rowInsert")
        .and(page.locator(`[data-key="users"]`))
        .waitFor({ state: "visible", timeout: 20e3 });
    };

    await goTo(page);
    await goToWorkspace();

    await page.waitForTimeout(500);
    if (!localNoAuthSetup) {
      await disablePwdlessAdminAndCreateUser(page);
    }
    await login(page);
    await page.waitForTimeout(500);

    await goTo(page, "/new-connection");
    await page.waitForTimeout(500);
    await goTo(page);

    /** Expect the workspace to have users table open */
    await goToWorkspace(false);

    /** SmartForm view mode shows correct data */
    await openTable(page, "login_attempts");
    await page.getByTestId("dashboard.window.viewEditRow").last().click();
    await page.waitForTimeout(2e3);
    const formField = await page.locator(
      getSelector({ testid: "SmartFormField", dataKey: "username" }),
    );

    const userTypeField = await formField.textContent();
    await expect(userTypeField).toEqual(`Username${USERS.test_user}`);
    await page.getByTestId("SmartForm.close").waitFor({ state: "visible" });
    await page.getByTestId("SmartForm.close").click();

    await closeWorkspaceWindows(page);

    /** SmartForm view mode shows correct buttons */
    await openTable(page, "user_types");
    await page.getByTestId("dashboard.window.viewEditRow").last().click();
    await page.getByTestId("SmartForm.close").waitFor({ state: "visible" });
    await page.getByTestId("SmartForm.delete").waitFor({ state: "visible" });
    await page.getByTestId("SmartForm.close").click();
  });

  test("State db backup and restore works", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "/login");
    await openConnection(page, "Prostgles UI state");

    const table = page.locator(`[data-table-name="user_types"]`);
    await expect(table).toBeVisible();
    await page.getByTestId("dashboard.goToConnConfig").click({ timeout: 15e3 });
    await page.getByTestId("config.bkp").click();
    await page
      .getByRole("button", { name: "Create backup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start backup", exact: true })
      .click();
    await page.getByText("Completed");

    await page.getByTestId("config.goToConnDashboard").click();
    await closeWorkspaceWindows(page);
    await page.reload();
    await expect(table).not.toBeAttached();

    await page.getByTestId("dashboard.goToConnConfig").click({ timeout: 15e3 });
    await page.getByTestId("config.bkp").click();
    await page.getByTestId("BackupControls.Restore").first().click();
    await typeConfirmationCode(page);

    await page.getByText("Restore", { exact: true }).click();
    await page.waitForTimeout(4e3);
    await page.reload();
    await page.getByTestId("config.goToConnDashboard").click();
    await expect(table).toBeVisible();
  });

  test("State db restore from file works", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "/login");
    await openConnection(page, "Prostgles UI state");

    const table = page.locator(`[data-table-name="user_types"]`);
    await expect(table).toBeVisible();
    await page.getByTestId("dashboard.goToConnConfig").click({ timeout: 15e3 });
    await page.getByTestId("config.bkp").click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("BackupsControls.Completed.download").first().click(),
    ]);

    const backupFilePath = join(backupDir, download.suggestedFilename());
    await download.saveAs(backupFilePath);

    // Optional: keep for later steps in this test
    console.log("Saved backup dump:", backupFilePath);

    await page.getByTestId("config.goToConnDashboard").click();
    await closeWorkspaceWindows(page);
    await page.reload();

    await expect(table).not.toBeAttached();

    await page.getByTestId("dashboard.goToConnConfig").click({ timeout: 15e3 });
    await page.getByTestId("config.bkp").click();

    await page.getByTestId("BackupsControls.restoreFromFile").click();

    // Feed the previously downloaded dump file into the restore form
    await page
      .getByTestId("Popup.content")
      .last()
      .locator('input[type="file"]')
      .setInputFiles(backupFilePath);

    await typeConfirmationCode(page);

    await page.getByText("Restore", { exact: true }).click();
    await page.waitForTimeout(8e3);
    await page.reload();

    await login(page, USERS.test_user, "/login");
    await openConnection(page, "Prostgles UI state");
    // await page.getByTestId("config.goToConnDashboard").click();
    await expect(table).toBeVisible();
  });

  test("Create db for Schema graph", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);

    await createDatabase(schemaGraphTestDbName, page, true);
  });

  test("Schema graph renders and can be zoomed and panned", async ({
    page: p,
  }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);

    await openConnection(page, "financial");

    /** Schema diagram works */
    await page.getByTestId("SchemaGraph").click();
    await page.waitForTimeout(1e3);
    await page
      .getByText("Reset layout")
      .waitFor({ state: "visible", timeout: 15e3 });

    await page.getByTestId("SchemaGraph.TopControls.resetLayout").click();
    await page.getByTestId("Btn.ClickConfirmation.Confirm").click();

    const getDrawnInfo = async () => {
      const drawnInfo: {
        scale: number;
        translate: { x: number; y: number };
        shapes: (
          | {
              type: "rectangle";
              coords: [number, number];
              data: {
                name: string;
              };
            }
          | {
              type: "linkline";
            }
        )[];
      } = await page.evaluate(() => {
        //@ts-ignore
        return document.querySelector("canvas")?._drawn;
      });
      return drawnInfo;
    };
    const initialShapesInfo = await getDrawnInfo();

    /** Scroll wheel zoom works */
    await page.mouse.move(300, 300);
    await page.mouse.wheel(100, 0);

    await page.waitForTimeout(1500);

    const zoomedInShapesInfo = await getDrawnInfo();
    await expect(zoomedInShapesInfo.scale).toBeGreaterThan(
      initialShapesInfo.scale,
    );

    const accountsTablePos = [155, 88] as const;
    await page.mouse.move(...accountsTablePos);
    await page.waitForTimeout(1e3);
    await page.mouse.down({ button: "left" });
    const newPosition = [
      accountsTablePos[0] + 200,
      accountsTablePos[1] + 50,
    ] as const;
    await page.mouse.move(...newPosition, {
      steps: 5,
    });
    await page.waitForTimeout(1e3);
    await page.mouse.up({ button: "left" });
    await page.waitForTimeout(1e3);
    // await page.mouse.move(...accountsTablePos, {
    //   steps: 5,
    // });
    // await page.getByTestId("Popup.close").click();
    // await page.getByTestId("SchemaGraph").click();
    // await page.waitForTimeout(2e3);
    const movedShapesInfo = await getDrawnInfo();
    const accountsTableInfo = initialShapesInfo.shapes.find(
      (t) => t.type === "rectangle" && t.data.name === "accounts",
    ) as
      | Extract<(typeof movedShapesInfo.shapes)[number], { type: "rectangle" }>
      | undefined;
    const movedAccountsTableInfo = movedShapesInfo.shapes.find(
      (t) => t.type === "rectangle" && t.data.name === "accounts",
    ) as
      | Extract<(typeof movedShapesInfo.shapes)[number], { type: "rectangle" }>
      | undefined;
    await expect(accountsTableInfo).toBeDefined();
    await expect(movedAccountsTableInfo).toBeDefined();
    await expect(movedAccountsTableInfo!.coords[0]).toBeGreaterThan(
      accountsTableInfo!.coords[0],
    );
  });

  test("Server settings and account tabs work ", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "/login");

    for (const pageWithTabs of ["/server-settings", "/account"]) {
      await goTo(page, pageWithTabs);

      const tabItems = await page.getByTestId("MenuList").locator("li").all();
      for (const tabItem of tabItems) {
        const tabKey = await tabItem.getAttribute("data-key");
        const tabText = await tabItem.textContent();
        await expect(tabKey).toBeTruthy();
        await expect(tabText).toBeTruthy();
        await tabItem.click();
        await page.waitForTimeout(500);
        await expect(page.locator(".Tabs_Content h2").first()).toContainText(
          tabText!,
        );
      }
    }
  });

  test("Email password registration setup", async ({ page: p, browser }) => {
    const page = p as PageWIds;

    await login(page);

    await goTo(page, "/component-list");
    await expect(page.locator("body")).toContainText(
      "All button heights match for loading state.",
    );

    await goTo(page, "/server-settings");

    /** SmartForm onLoaded bug */
    await page.locator(`[data-key="security"]`).click();
    await page
      .getByText("Allowed IPs and subnets", { exact: true })
      .waitFor({ state: "visible", timeout: 15e3 });

    await page.locator(`[data-key="auth"]`).click();
    /** The url will be updated automatically and this will page trigger a reload */
    await page.waitForTimeout(1e3);
    const input = await page.getByLabel("Website URL");
    await expect(await input.getAttribute("value")).toEqual(
      "http://localhost:3004",
    );
    await page.getByTestId("EmailAuthSetup").locator("button").click();
    await page.getByTestId("EmailAuthSetup.SignupType").click();
    await page.locator(`[data-key="withPassword"]`).click();
    const fillHostAndTest = async (hostVal: string) => {
      await page.getByTestId("EmailSMTPAndTemplateSetup").click();
      await page.getByText("Email Provider").click();
      await page.locator(`[data-label="Host"] input`).fill(hostVal);
      await page
        .getByTestId("EmailSMTPAndTemplateSetup")
        .getByText("Save")
        .click();
    };
    await fillHostAndTest("invalid___prostgles-test-mock");
    await page.getByText("Enabled").click();
    await page.getByText("Save").click({ timeout: 10e3 });
    const errNode = await page.getByTestId("EmailAuthSetup.error");
    await expect(await errNode.textContent()).toContain(
      // "getaddrinfo ENOTFOUND invalid___prostgles-test-mock", // or EAI_AGAIN
      "getaddrinfo E",
    );
    await expect(await errNode.textContent()).toContain(
      "invalid___prostgles-test-mock",
    );
    await fillHostAndTest("prostgles-test-mock");
    await page.waitForTimeout(1500);
    const errNode1 = await page.getByTestId("EmailAuthSetup.error");
    await expect(await errNode1.count()).toBe(0);
  });

  test("Email password registration", async ({ page: p, browser }) => {
    const page = await browser.newPage();
    const newPage = p as PageWIds;
    await login(page);

    await goTo(newPage, "/login");

    /** Test failed login throttle */
    await newPage.locator("#username").fill(USERS.new_user);
    await newPage.locator("#password").fill(USERS.new_user);
    const start = Date.now();
    await newPage.getByRole("button", { name: "Sign in" }).click();
    await newPage.getByTestId("Login.error").waitFor({ state: "visible" });
    await expect(Date.now() - start).toBeGreaterThan(499);
    await newPage.reload();

    /** Passwords do not match registration check */
    await newPage.getByTestId("Login.toggle").click();
    await newPage.locator("#username").fill(USERS.new_user);
    await newPage.locator("#password").fill(USERS.new_user);
    await newPage.getByRole("button", { name: "Sign up" }).click();
    await expect(
      await newPage.getByTestId("Login.error").textContent(),
    ).toContain("Passwords do not match");
    await newPage.locator("#new-password").fill(USERS.new_user);
    await newPage.getByRole("button", { name: "Sign up" }).click();
    await expect(
      await newPage
        .getByTestId("AuthNotifPopup")
        .getByTestId("Popup.content")
        .textContent(),
    ).toBe(
      "Email verification sent. Open the verification url or enter the code to confirm your email",
    );
    await newPage.getByRole("button", { name: "Ok" }).click();

    const newUser = await runDbsSql(
      page,
      `SELECT * FROM users WHERE username = $1`,
      [USERS.new_user],
      { returnType: "row" },
    );
    const code = newUser?.registration?.email_confirmation?.confirmation_code;
    await expect(typeof code).toBe("string");
    await expect(code.length).toBe(6);
    await newPage.locator("#email-verification-code").fill(code);
    await newPage.getByRole("button", { name: "Confirm email" }).click();
    await expect(
      await newPage
        .getByTestId("AuthNotifPopup")
        .getByTestId("Popup.content")
        .textContent(),
    ).toBe("Your email has been confirmed. You can now sign in");
    await newPage.getByRole("button", { name: "Ok" }).click();

    await newPage.locator("#username").fill(USERS.new_user);
    await newPage.locator("#password").fill(USERS.new_user);
    await newPage.getByRole("button", { name: "Sign in" }).click();

    await newPage.getByTestId("App.colorScheme").waitFor({ state: "visible" });
  });

  test("Enable email magic link registrations & Translations", async ({
    page: p,
  }) => {
    const page = p as PageWIds;

    await login(page);
    await goTo(page, "/server-settings");
    await page.locator(`[data-key="auth"]`).click();
    await setupMagicLinkAuth(page);

    await goTo(page, "/connections");
    await page.getByTestId("App.LanguageSelector").click();
    await page.locator(`[data-key="es"]`).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.getByText("Nueva conexión").waitFor({ state: "visible" });
    await page.getByTestId("App.LanguageSelector").click();
    await page.locator(`[data-key="en"]`).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("Email magic link signup", async ({ page: p, browser }) => {
    const newPage = p as PageWIds;
    const page: PageWIds = await browser.newPage();

    /**
     * Can still login with password with email magic link registrations
     */
    await goTo(page, "/login");
    await page.locator("#username").fill(USERS.test_user);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#password").waitFor({ state: "visible" });
    await page.locator("#password").fill(USERS.test_user);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("App.colorScheme").waitFor({ state: "visible" });

    await goTo(newPage, "/login");

    await newPage.locator("#username").fill(USERS.new_user1);
    await newPage.getByRole("button", { name: "Continue" }).click();

    await expect(
      await newPage
        .getByTestId("AuthNotifPopup")
        .getByTestId("Popup.content")
        .textContent(),
    ).toBe("Magic link sent. Open the url from your email to login");
    await newPage.getByRole("button", { name: "Ok" }).click();

    const newUser = await runDbsSql(
      page,
      `
      SELECT * 
      FROM users 
      WHERE username = $1
      `,
      [USERS.new_user1],
      { returnType: "row" },
    );
    const failedAttempts = await runDbsSql(
      page,
      `
      DELETE -- SELECT * 
      FROM login_attempts
      `,
      undefined,
      { returnType: "rows" },
    );
    console.log("failedAttempts", failedAttempts);
    const code = newUser?.registration.otp_code;
    await expect(typeof code).toBe("string");
    await goTo(newPage, `/magic-link?code=${code}&email=${USERS.new_user1}`);

    await newPage.getByTestId("App.colorScheme").waitFor({ state: "visible" });

    await runDbsSql(
      page,
      `
      DELETE FROM login_attempts;
      `,
      undefined,
      { returnType: "row" },
    );
  });

  test("System theme works as expected", async ({ page: p }) => {
    const page = p as PageWIds;
    await page.emulateMedia({ colorScheme: "dark" });
    await goTo(page);
    await page.locator("html.dark-theme").waitFor({ state: "visible" });
    const darkBackgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    await expect(darkBackgroundColor).toBe("rgb(26, 25, 25)");

    await page.emulateMedia({ colorScheme: "light" });
    await goTo(page);
    await page.locator("html.light-theme").waitFor({ state: "visible" });
    const lightBackgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    await expect(lightBackgroundColor).toBe("rgb(244, 245, 247)");
  });

  test("Setup Free LLM assistant signup", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);
    const existingCloudDb = await page
      .getByRole("link", {
        name: "cloud",
        exact: true,
      })
      .count();

    if (existingCloudDb) {
      return;
    }

    const dbName = "cloud";
    await createDatabase(dbName, page, false);

    /** Create table */
    await runDbSql(
      page,
      `CREATE TABLE IF NOT EXISTS example_table (id SERIAL PRIMARY KEY, name TEXT);`,
    );
    await expect(
      page
        .getByTestId("dashboard.menu.tablesSearchList")
        .locator(getDataKey("example_table")),
    ).toBeVisible();

    await page.getByTestId("dashboard.goToConnConfig").click();

    await page.getByTestId("config.auth").click();
    await setupMagicLinkAuth(page);
    await page.getByText("Enabled").click();
    await page.getByText("Save").click();

    /** Enable http api */
    await page.getByTestId("config.api").click();
    await page.getByText("Enabled").click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.locator("input#port").fill("3005");
    await page.waitForTimeout(500);
    await page.waitForEvent("load");
    await page.reload();
    await page.locator("input#port").waitFor({ state: "visible" });
    await expect(page.locator("input#port")).toHaveValue("3005");

    /** Create API token with sample html */
    await page.getByTestId("config.api").click();
    await page.getByTestId("APIDetailsTokens.CreateToken").click();
    await page.getByTestId("APIDetailsTokens.CreateToken.generate").click();
    await page.getByTestId("Popup.close").click();

    await page.getByTestId("APIDetailsHttp.Examples").click();
    const monacoEditor = page.getByTestId("MonacoEditor");
    await monacoEditor.waitFor({ state: "visible" });
    const jsContent = await monacoEditor.textContent();
    const indexHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title> Prostgles </title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1"> 
        <script src="./script.js"></script>
      </head>
      <body style="white-space: pre">

       <h1>Loading...</h1>
        
      </body>
    </html>    
    `;
    const demoDir = resolve(__dirname, "../demo");
    await mkdir(demoDir, { recursive: true });
    const indexFilePath = join(demoDir, "index.html");
    await writeFileSync(indexFilePath, indexHtml);
    const scriptFilePath = join(demoDir, "script.js");
    await writeFileSync(
      scriptFilePath,
      `
      (async () => {
        ${jsContent}
        document.body.innerText = JSON.stringify(schema, null, 2);
      })()
      `,
    );

    // TOOD: Check ws api as well
    // await page.getByTestId("APIDetailsWs.Examples").click();
    // await page.locator(getDataKey("Vanilla JS")).click();
    // const [download] = await Promise.all([
    //   page.waitForEvent("download"),
    //   page.getByText("Download code sample", { exact: true }).click(),
    // ]);
    // await download.saveAs(filePath);
    await page.getByTestId("Popup.close").click();

    /** Enable Web app */
    await page.getByTestId("config.webApp").click();
    await page.waitForTimeout(1500);
    await page.getByTestId("WebApp.directory").click();
    await fileBrowserGoToPath(page.getByTestId("FileTree"), [
      "ui",
      "e2e",
      "demo",
    ]);
    await page.getByText("Select directory", { exact: true }).click();
  });

  test("Web app", async ({ page: p }) => {
    const page = p as PageWIds;
    await page.goto("http://localhost:3005");
    await expect(page.locator("body")).toContainText("example_table");
  });

  test("Setup Free LLM assistant functions", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    /** Create cloud db */
    await page.getByRole("link", { name: "Cloud" }).click();
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.api").click();

    /** Add server-side func */
    await page.getByTestId("config.methods").click();

    /** This timeout is crucial in ensuring monaco editor shows suggestions */
    await page.getByText("Create function").click({ timeout: 10e3 });
    await page.locator("input#function_name").fill("askLLM");
    await page.waitForTimeout(1e3);
    await monacoType(page, ".MethodDefinition", "dbo.t", {
      deleteAll: false,
      /** This helps with flaky tests done on workers */
      pressAfterTyping: [
        "Backspace",
        "Backspace",
        "Backspace",
        "Backspace",
        "Backspace",
      ],
    });
    await monacoType(page, ".MethodDefinition", "dbo.t", {
      deleteAll: false,
    });
    await page.keyboard.press("Tab");

    /** Ensure db schema suggestions work */
    const initialCode =
      "export const run: ProstglesMethod = async (args, { db, dbo, user, callMCPServerTool }) => {\n  dbo.tx\n}";
    const funcCode = await getMonacoValue(page, ".MethodDefinition");
    await expect(funcCode).toEqual(initialCode);

    /** Add llm server side func */
    const fullCode = initialCode.replace("dbo.tx", testAskLLMCode + "dbo.tx");
    await monacoType(page, ".MethodDefinition", fullCode, {
      deleteAll: true,
      keyPressDelay: 0,
    });
    const funcCode2 = await getMonacoValue(page, ".MethodDefinition");
    const allWhiteSpaceAsSingleSpace = (v: string) => {
      const res = v.replace(/\s+/g, " ");
      return res;
    };
    await expect(allWhiteSpaceAsSingleSpace(funcCode2)).toEqual(
      allWhiteSpaceAsSingleSpace(fullCode),
    );

    /** Add askLLM func args */
    for (const [index, argName] of [
      "messages",
      "model",
      "tools",
      "max_tokens",
      "temperature",
    ].entries()) {
      await page.getByTitle("Add new item").click();
      await page.getByLabel("Argument name").last().fill(argName);
      await page.getByLabel("Data type").last().click();
      await page.locator(`[data-key="any"]`).click();
      await page.waitForTimeout(500); // Popup closes but also has this "Show more" button
      await page.getByTitle("Show more").click();
      await page.getByText("Optional", { exact: true }).nth(index).click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: "Add function" }).click();

    /** Page will reload after func is added */
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1e3);
    /** JSONBSchema localValue bugs. Argument must show */
    await page.getByTitle("Edit function").click();
    await page.waitForTimeout(1e3);
    await page.getByLabel("Argument name").last().waitFor({ state: "visible" });
    await page.getByTestId("Popup.close").click();

    /**
     * Publish functions for user
     */
    await page.getByTestId("config.ac").click();
    await createAccessRule(page, "default");
    await page.getByText("askLLM").click();
    await page.getByText("Create rule").click();
    await page.waitForTimeout(1e3);

    /** Signup for free LLM assistant */
    await goTo(page, "/connections");
    await page.getByRole("link", { name: "Prostgles UI state" }).click();
    await page.getByTestId("AskLLM").click();
    await page.getByTestId("SetupLLMCredentials.free").click({ timeout: 10e3 });
    await page.locator("input#email").fill(USERS.free_llm_user1);
    await page.getByTestId("ProstglesSignup.continue").click();
    await page.waitForTimeout(1e3);
    const llmUser = await runDbsSql(
      page,
      `
      SELECT * 
      FROM users 
      WHERE username = $1
      `,
      [USERS.free_llm_user1],
      { returnType: "row" },
    );
    const freeLLMCode = llmUser?.registration.otp_code;
    await expect(typeof freeLLMCode).toBe("string");
    await page.locator("input#otp-code").fill(freeLLMCode);
    await page.getByTestId("ProstglesSignup.continue").click();
    await page.waitForTimeout(1e3);
    await page.locator(".ProstglesSignup").waitFor({ state: "detached" });
  });

  test("Test LLM responses and tools", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");

    await runDbsSql(
      page,
      `
      UPDATE mcp_servers SET enabled = false WHERE name IN ('playwright', 'prostgles-ui');
      DELETE FROM mcp_server_tools WHERE server_name IN ('playwright', 'prostgles-ui');
      `,
    );
    await runDbSql(
      page,
      `
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        company_name TEXT,
        amount NUMERIC,
        currency TEXT,
        date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      `,
    );
    /* Wait for schema change */
    await page.waitForTimeout(2e3);

    await deleteExistingLLMChat(page);

    await page.getByTestId("Popup.close").click();

    const userMessage = "hey";
    const responses = await getLLMResponses(page, [userMessage]);
    const messageCost = "$0";
    await expect(responses).toEqual([
      {
        isOk: false,
        response: messageCost + "free ai assistant" + userMessage,
      },
    ]);

    await page.getByTestId("AskLLM").click();

    await sendAskLLMMessage(page, " request_tool_access ");
    await page
      .getByTestId("RequestToolAccess.Approve")
      .click({ timeout: 10e3 });

    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Requested access to websearch tool and read access to receipts table in the database.`,
      { timeout: 10e3 },
    );
    await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
    await expect(page.getByTestId("DatabaseAccessEditor.Mode")).toContainText(
      "Custom",
    );
    await expect(
      page
        .getByTestId("DatabaseAccessEditor.TableRules")
        .last()
        .locator(getDataKey("receipts"))
        .locator(`button[data-color="action"]`),
    ).toContainText("SELECT", { ignoreCase: false });
    await page.getByTestId("Popup.close").last().click();
    await newChat(page);

    await setModelByText(page, "son");

    await expect(page.getByTestId("LLMChatOptions.MCPTools")).toContainText(
      "9",
    );
    await sendAskLLMMessage(page, " task ");

    await page
      .getByTestId("RequestToolAccess.Approve")
      .click({ timeout: 10e3 });
    await expect(page.getByTestId("RequestToolAccess")).toContainText(
      "Added tool access",
      { timeout: 10e3 },
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Added fetch tool access and database permissions for receipts table.",
      { timeout: 10e3 },
    );

    await expect(page.getByTestId("LLMChatOptions.MCPTools")).toContainText(
      "12",
    );

    const dbToolsBtn = await page
      .getByTestId("LLMChatOptions.DatabaseAccess")
      .locator("button");
    await expect(await dbToolsBtn.getAttribute("class")).toContain(
      "btn-color-action",
    );

    await setPromptByText(page, "dashboard");

    await sendAskLLMMessage(
      page,
      "I need some useful dashboards to track performance",
    );
    await page
      .getByTestId("AskLLMChat.LoadSuggestedDashboards")
      .click({ timeout: 18e3 });

    const workspaceBtn = await page.getByTestId("WorkspaceMenu.list");
    await expect(workspaceBtn).toContainText("Customer Insights");

    await page.waitForTimeout(1e3);
    await page.getByTestId("AskLLM").click();

    await page.getByTestId("AskLLMChat.UnloadSuggestedDashboards").click();
    await expect(workspaceBtn).not.toContainText("Customer Insights");

    await page.waitForTimeout(2e3);
  });

  test("Document to markdown service and conversion works", async ({
    page: p,
  }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();

    /**
     * Only test locally due to service image size
     */
    if (!process.env.CI) {
      const addFile = async () => {
        const pdfFilePath = join(
          __dirname,
          "..",
          "tests",
          "testAskLLM",
          "sample.pdf",
        );
        const fileChooserPromise = page.waitForEvent("filechooser");
        await page.getByTestId("Chat.addFiles").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(pdfFilePath);
      };
      await addFile();
      const toggle = page.getByTestId(
        "ChatFileAttachments.convertDocsToMarkdown",
      );
      await toggle.click();
      /** Expect the switch toggle to show loader */
      await expect(
        page
          .getByTestId("Chat.sendWrapper")
          .locator(".SwitchToggle")
          .getByTestId("Loading"),
      ).toBeVisible();

      /** Service finished starting. This might take much longer if it needs installing */
      await expect(page.getByLabel("Convert docs to markdown")).toBeChecked({
        timeout: 90e3,
      });

      await page.keyboard.press("Control+KeyK");
      await page.waitForTimeout(1500);
      await page.keyboard.type("serv");
      await page.keyboard.press("Enter");
      await expect(
        page.locator(getDataKey("documents")).getByTitle("Stop service"),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      const itemBtn = page
        .getByTestId("Chat.attachedFiles")
        .getByTestId("MediaViewer")
        .getByText("sample.pdf");
      await expect(itemBtn).toBeVisible({ timeout: 15e3 });

      /** Shows content in popup */
      await itemBtn.click();
      await expect(page.getByTestId("Popup.header").last()).toContainText(
        "sample.pdf",
      );

      await page.getByTestId("Popup.close").last().click();

      /** Removing works */
      await page.getByTestId("ChatFileAttachments.removeFile").click();
      await expect(itemBtn).not.toBeAttached();

      /** Re-adding the same file works */
      await addFile();

      await expect(itemBtn).toBeVisible({ timeout: 15e3 });

      await page.getByTestId("Chat.send").click();

      /** In chat file visible */
      const inChatItemBtn = page
        .getByTestId("Chat.messageList")
        .getByTestId("LLMChatMessageContent.textDocument")
        .getByText("sample.pdf");
      await expect(inChatItemBtn).toBeVisible({ timeout: 15e3 });

      /** Agent was provided the text content */
      await expect(page.getByTestId("Chat.messageList")).toContainText(
        "This is a sample PDF",
        { timeout: 15e3 },
      );

      await inChatItemBtn.click();
      await expect(page.getByTestId("Popup.header").last()).toContainText(
        "sample.pdf",
      );
      await expect(page.getByTestId("Popup.content").last()).toContainText(
        "This is a sample PDF",
      );
      await page.getByTestId("Popup.close").last().click();
    }
  });

  test("Test LLM tools", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();
    await newChat(page);
    await toggleMCPTools(page, ["fetch"]);
    await sendAskLLMMessage(page, " mcp ");
    await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .click({ timeout: 10e3 });
    await page.waitForTimeout(1e3);
    const mcpToolUse = await getAskLLMLastMessage(page);
    await expect(mcpToolUse).toContainText(
      "successfully fetched the login page",
      {
        timeout: 10_000,
      },
    );

    /** Ensure chat name updates based on first message */
    await expect(page.getByTestId("LLMChat.select")).toContainText("mcp");

    await sendAskLLMMessage(page, " mcp ");
    await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("Popup.close").last().click();
    await page.waitForTimeout(1e3);
    await sendAskLLMMessage(page, " interrupt tool call ");
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Tool use requests were interrupted by the user",
      {
        timeout: 10e3,
      },
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "free ai assistant interrupt tool call",
    );

    await sendAskLLMMessage(page, " get_tool_schemas ");
    // Auto-approved by default
    await page
      .getByTestId("ToolUseMessage.toggle")
      .getByText(
        'prostgles-ui--get_tool_schemas\nmcpServerTools: {"web":{"fetch":1}}',
      )
      .click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Fetches content from a URL`,
    );

    await page.waitForTimeout(1e3);
    await sendAskLLMMessage(page, " mcpplaywright ");
    await page
      .getByTestId("ToolUseMessage.toggleGroup")
      .getByText("2 tool calls")
      .last()
      .click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_navigate" is invalid. Try enabling and reloading the tools`,
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_snapshot" is invalid. Try enabling and reloading the tools`,
    );

    await enableMCPServers(page, ["playwright"]);
    await page
      .getByText("browser_tabs")
      .waitFor({ state: "visible", timeout: 10e3 }); // wait for tools list to refresh
    await page.getByTestId("Popup.close").last().click();

    await page.waitForTimeout(2e3);
    await sendAskLLMMessage(page, " mcpplaywright ");
    await page
      .getByTestId("ToolUseMessage.toggleGroup")
      .getByText("2 tool calls")
      .last()
      .click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_navigate" is not allowed`,
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_snapshot" is not allowed`,
    );

    await toggleMCPTools(page, ["browser_navigate", "browser_snapshot"]);

    await sendAskLLMMessage(page, " mcpplaywright ");
    await page.waitForTimeout(2e3);
    await page.getByTestId("AskLLMToolApprover.AllowOnce").click();
    await page.waitForTimeout(200);
    await page.getByTestId("AskLLMToolApprover.AllowOnce").click();
    await page.waitForTimeout(10e3);
    await page
      .getByTestId("ToolUseMessage.toggleGroup")
      .getByText("2 tool calls")
      .last()
      .click();
    const lastToolUseBtn = await page
      .getByTestId("Chat.messageList")
      .getByText("browser_snapshot")
      .last();
    await lastToolUseBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1e3);
    await lastToolUseBtn.click();
    await page.waitForTimeout(1e3);
    /** Can be flaky */
    await expect(page.getByTestId("MarkdownMonacoCode").last()).toContainText(
      `Page Title: Prostgles`,
      { timeout: 15e3 },
    );
    await lastToolUseBtn.click();

    await page.waitForTimeout(2e3);
    /** Test max consecutive tool call fails */
    await sendAskLLMMessage(page, " mcpfail ");
    await page.getByTestId("ToolUseMessage.toggleGroup").last().click();
    await expect(
      page
        .getByTestId("Chat.messageList")
        .getByText(`Tool name "web--invalidfetch" is invalid`),
    ).toHaveCount(5, { timeout: 30e3 });
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `failed consecutive tool requests reached`,
    );

    /** Test max consecutive tool call fails */
    for (let step = 0; step < 5; step++) {
      await sendAskLLMMessage(page, " cost ");
    }
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Maximum number (5) of failed consecutive tool requests reached`,
    );

    /** Test max chat cost */
    const defaultMaxCost = 5;
    const costPerMsg = 1.8;
    await newChat(page);
    for (
      let step = 0;
      step < Math.ceil(defaultMaxCost / costPerMsg) + 1;
      step++
    ) {
      await page.waitForTimeout(1500);
      await sendAskLLMMessage(page, "cost", true);
    }
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Maximum total cost of the chat (5) reached. Current cost: 5.4`,
      { timeout: 8_000 },
    );

    const maxCost = 4;
    await page.getByTestId("LLMChatOptions.toggle").click();
    await fillSmartForm(page, "llm_chats", {
      max_total_cost_usd: maxCost.toString(),
    });
    await page.getByTestId("Popup.close").last().click();
    /** Test max speculative chat cost */
    await newChat(page);
    await enableMCPServers(page, ["filesystem"], true);
    await fileBrowserGoToPath(page.getByTestId("FileTree"), [
      "ui",
      "client",
      "node_modules",
    ]);

    await page.getByTestId("MCPServerConfig.save").click();
    await page.getByTestId("Popup.close").last().click();
    await toggleMCPTools(page, ["directory_tree"], true);
    for (let step = 0; step < Math.floor(maxCost / costPerMsg); step++) {
      await page.waitForTimeout(1500);
      await sendAskLLMMessage(page, "cost", true);
    }
    await sendAskLLMMessage(page, " estimated_cost ");
    await expect(
      page.getByTestId("Chat.messageList").locator(".message").last(),
    ).toContainText(
      `Maximum total cost of the chat (5) will be reached after sending this message`,
      { timeout: 30_000 },
    );
  });

  test("Test LLM sandbox tools", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();
    /* MCP Docker sandbox */
    await newChat(page);
    /* Prompt persists from the prev chat */
    await expect(page.getByTestId("LLMChatOptions.Prompt")).toContainText(
      "Create dashboards",
    );

    await page.getByTestId("LLMChatOptions.MCPTools").click({ timeout: 10e3 });
    await page
      .locator(getDataKey("prostgles-ui"))
      .getByText("run_code_in_sandbox", { exact: true })
      .waitFor({ state: "visible", timeout: 15e3 });
    await page.waitForTimeout(2e3);
    /** Tools are loaded after enabling */
    await page
      .locator(getDataKey("prostgles-ui"))
      .getByTestId("MCPServerFooterActions.refreshTools")
      .click();
    await expect(page.getByTestId("Popup.content").last()).toContainText(
      ` tools for "prostgles-ui" server`,
    );
    await page.getByText("OK", { exact: true }).click();
    await page
      .locator(getDataKey("prostgles-ui"))
      .getByText("run_code_in_sandbox", { exact: true })
      .click();
    await page.waitForTimeout(1e3);
    await page.getByTestId("Popup.close").last().click();

    const dockerRunAndExpect = async (
      result: string[] | string,
      prepareCb: (() => Promise<void>) | undefined = undefined,
      locator: Locator | undefined = undefined,
    ) => {
      await sendAskLLMMessage(page, " mcpsandbox ");
      await page
        .getByTestId("AskLLMToolApprover.AllowOnce")
        .click({ timeout: 20e3 });
      await expect(page.getByTestId("Chat.messageList")).toContainText(
        "create a container that runs",
        { timeout: 60e3 },
      );
      await page.waitForTimeout(3e3);

      await prepareCb?.();

      await page
        .getByTestId("DockerSandboxCreateContainer.stop")
        .waitFor({ state: "detached", timeout: 40e3 });

      for (const res of Array.isArray(result) ? result : [result]) {
        await expect(
          locator ?? page.getByTestId("ToolUseMessage").last(),
        ).toContainText(res, {
          timeout: 20e3,
        });
      }
    };
    await runDbSql(page, `DROP TABLE IF EXISTS users ;`);

    await dockerRunAndExpect(
      `Validation error for userInput definition key1: the following table names do not match any new tables or existing tables: ["users"]`,
    );

    await runDbSql(
      page,
      `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT);`,
    );

    await dockerRunAndExpect(
      `cannot execute CREATE TABLE in a read-only transaction`,
      async () => {
        await page
          .getByTestId("AskLLMToolApprover.AllowOnce")
          .click({ timeout: 20e3 });
        await page.waitForTimeout(1e3);
        await page.getByTestId("AskLLMToolApprover.AllowOnce").click();
        await page
          .getByTestId("ToolUseMessage")
          .last()
          .getByTestId("FullscreenWrapper.toggleFullscreen")
          .nth(1)
          .click();
      },
      page.getByTestId("DockerSandboxCreateContainer.Logs").last(),
    );
    await runDbSql(page, `DROP TABLE users;`);

    await page.keyboard.press("Escape");
    await page
      .getByTestId("LLMChatOptions.DatabaseAccess")
      .click({ timeout: 10e3 });

    await runDbSql(
      page,
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL DEFAULT 'regular',
        username TEXT NOT NULL UNIQUE, 
        created_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO users (username) 
      VALUES ('fresh_user') ON CONFLICT DO NOTHING;
      `,
    );
    await page.getByTestId("DatabaseAccessEditor.Mode").click();

    await page
      .getByTestId("DatabaseAccessEditor.Mode")
      .locator(getDataLabel("None"))
      .click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("DatabaseAccessEditor.Mode")).toContainText(
      "None",
    );
    await page.getByTestId("DatabaseAccessEditor.Mode").click();
    await page
      .getByTestId("DatabaseAccessEditor.Mode")
      .locator(getDataLabel("Run readonly SQL"))
      .click();

    /** Auto approve to ensure the container can run the query */
    await page.getByLabel("Auto approve", { exact: true }).last().click();
    await page.getByTestId("Popup.close").last().click();
    await dockerRunAndExpect(
      [
        `username: 'fresh_user'`,
        `cannot execute CREATE TABLE in a read-only transaction`,
      ],
      async () => {
        await page
          .getByTestId("ToolUseMessage")
          .last()
          .getByTestId("FullscreenWrapper.toggleFullscreen")
          .nth(1)
          .click();
      },
      page.getByTestId("DockerSandboxCreateContainer.Logs").last(),
    );
    await page.keyboard.press("Escape");

    /** Test stopping chat */
    await newChat(page);
    await sendAskLLMMessage(page, " longresponse ", {
      onAfterSend: async () => {
        await page.getByTestId("Chat.sendStop").click();
      },
    });
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `longresponse`,
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `aborted by user`,
    );

    /** Test parallel tool use single auto-approve */
    await newChat(page);
    await sendAskLLMMessage(page, " parallel_calls ");

    await expect(
      page.getByTestId("ToolUseMessage.toggleGroup").last(),
    ).toContainText("3 tool calls");
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Tool call failed. Will not retry",
      {
        timeout: 30e3,
      },
    );
    await page.getByTestId("ToolUseMessage.toggleGroup").last().click();
    await expect(
      page
        .getByTestId("Chat.messageList")
        .getByText(
          'Tool name "web--fetch" is not allowed. Must enable it for this chat',
        ),
    ).toHaveCount(3, { timeout: 30e3 });

    await newChat(page);
    await toggleMCPTools(page, ["fetch"]);
    await sendAskLLMMessage(page, " parallel_calls ");

    /** Should not request approval for the other 2 requests */
    await page.getByTestId("AskLLMToolApprover.AllowAlways").click();

    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Fetched in parallel successfully",
      {
        timeout: 30e3,
      },
    );
    await page.getByTestId("ToolUseMessage.toggleGroup").last().click();

    await expect(
      page.locator(
        getCommandElemSelector("ToolUseMessage.toggle") +
          `[data-color="default"]`,
      ),
    ).toHaveCount(3, {
      timeout: 30e3,
    });

    await newChat(page);
    await toggleMCPTools(page, ["websearch", "get_snapshot"]);
    await page.waitForTimeout(7e3); // wait for the server to start
    await sendAskLLMMessage(page, " websearch ");
    await page.getByTestId("AskLLMToolApprover.AllowAlways").click();
    await page.getByTestId("AskLLMToolApprover.AllowAlways").click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Search done.",
      {
        timeout: 30e3,
      },
    );

    await page.getByTestId("ToolUseMessage.toggleGroup").click();
    await page.getByTestId("ToolUseMessage.toggle").first().click();
    const text = await page.getByTestId("ToolUseMessage").first().textContent();
    if (text?.includes("No results found.")) {
      // Probably due to engines limiting searches
    } else if (text?.includes("https://prostgles.com/")) {
      // Websearch results changing and not a fail
    } else {
      await expect(page.getByTestId("ToolUseMessage").first()).toContainText(
        "https:",
        // "https://www.postgresql.org/",
      );
    }
    await page.getByTestId("ToolUseMessage.toggle").first().click();
    await page.getByTestId("ToolUseMessage.toggle").last().click();
    await expect(page.getByTestId("ToolUseMessage").last()).toContainText(
      "Page Title: Prostgles UI",
    );

    /** Speech to text */
    await speechToTextTest(page);

    /** Create component */
    await newChat(page);
    await setPromptByText(page, "Web app development", false);
    /** The web app must be created from template */
    await page.getByTestId("WebAppConfig.createFromTemplate").click();
    await page.getByTestId("Btn.ClickConfirmation.Confirm").click();
    /** Page will reload */
    await page.waitForEvent("load");
    await page.getByTestId("AskLLM").click();
    await sendAskLLMMessage(
      page,
      " I need you to create a user list component ",
    );
    await page
      .getByTestId("AskLLMToolApprover.AllowAlways")
      .click({ timeout: 10e3 });
  });

  test("Agentic workflow", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await closeWorkspaceWindows(page);
    await page.getByTestId("AskLLM").click();

    await setupAskLLMToolUse(page);

    /** Test ask tool */
    await newChat(page);
    await sendAskLLMMessage(page, " ask_tool ");
    await page.getByTestId("AskUserQuestions").getByText("Red").first().click();
    await page
      .getByTestId("AskUserQuestions")
      .getByText("Yellow")
      .nth(1)
      .click();
    await page.getByTestId("AskUserQuestions").getByText("Blue").nth(1).click();
    await page
      .getByTestId("AskUserQuestions")
      .locator(getDataKey("table-columns"))
      .click();
    await page
      .locator(getDataKey("table-columns"))
      .locator(getDataKey("type"))
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByTestId("AskUserQuestions")
      .locator(getDataKey("table-name"))
      .click();
    await page
      .locator(getDataKey("table-name"))
      .locator(getDataKey("receipts"))
      .click();
    await page
      .locator(getDataKey("free-text"))
      .locator("input")
      .fill("some free text");
    await page.getByTestId("AskUserQuestions.confirm").click();
    await expect(
      page.getByTestId("AskUserQuestions.confirm"),
    ).not.toBeAttached();
    const buttons = page.getByTestId("AskUserQuestions").locator("button");
    for (const btn of await buttons.all()) {
      await expect(btn).toBeDisabled();
    }
    await expect(page.getByTestId("AskUserQuestions")).toContainText(
      "some free text",
    );

    await newChat(page);
    await sendAskLLMMessage(page, " ask_tool_invalid ");
    await page.waitForTimeout(1e3);
    await expect(
      page.getByTestId("AskUserQuestions").locator("button"),
    ).not.toBeAttached();

    await newChat(page);
    await setPromptByText(page, "Create workflow");

    /** Cleanup for any reruns */
    await page.waitForTimeout(1e3);
    await runDbSql(
      page,
      `
      DROP TABLE IF EXISTS new_users;
      DELETE FROM users WHERE type = 'from-agent';
      `,
    );
    await page.waitForTimeout(1e3);
    await sendAskLLMMessage(page, " agentic_workflow ");

    const startWorkFlowAndExpectError = async (errorMessage: string) => {
      await page.getByTestId("AgenticWorkflow.start").click({
        timeout: 60e3,
      });
      await expect(page.getByTestId("Alert")).toContainText(errorMessage, {
        timeout: 60e3,
      });
      await page.getByText("OK", { exact: true }).click();
    };

    /** Fill user input form */
    await startWorkFlowAndExpectError(
      `Missing required user input: "Enum value"`,
    );
    await page.locator(getDataKey("enum")).click();
    await page.locator(`[data-key="value1"]`).last().click();

    await startWorkFlowAndExpectError(
      `Missing required user input: "Sort column"`,
    );
    await page.locator(getDataKey("custom") + " input").fill("a");

    const selectFileOrFolderPath = async (fileTreeKey: string) => {
      const capitalizeFirstLetter = (s: string) =>
        s.charAt(0).toUpperCase() + s.slice(1);
      const label = capitalizeFirstLetter(fileTreeKey.replace(/-/g, " "));
      await startWorkFlowAndExpectError(
        `Missing required user input: ${JSON.stringify(label)}`,
      );
      const isMultiple = fileTreeKey.endsWith("s");
      await page.locator(getDataKey(fileTreeKey)).click();
      const path =
        fileTreeKey.includes("file") ?
          ["ui", "client", "package.json"]
        : ["ui", "client", "src"];
      await fileBrowserGoToPath(page.getByTestId("FileTree").first(), path);
      if (isMultiple) {
        await page.getByText("Done").first().click();
      }
    };

    await selectFileOrFolderPath("file-path");
    await selectFileOrFolderPath("file-paths");

    await startWorkFlowAndExpectError(
      `Missing required user input: "Table name"`,
    );
    await page.locator(getDataKey("table-name")).click();
    await page.locator(`[data-key="example_table"]`).last().click();

    await selectFileOrFolderPath("folder-path");
    await selectFileOrFolderPath("folder-paths");

    await startWorkFlowAndExpectError(
      `Missing required user input: "Table column"`,
    );
    await page.locator(getDataKey("table-column")).click();
    await page.locator(`[data-key="id"]`).last().click();

    await startWorkFlowAndExpectError(
      `Missing required user input: "Users filter"`,
    );
    await page.getByTestId("RenderFilter.edit").click();
    await page.getByTestId("SmartAddFilter").click();
    await page.locator(getDataKey("type")).last().click();
    await page.getByTestId("SearchList.Input").last().click();
    await page.locator(`[data-label="regular"]`).first().click();
    await page.getByTestId("RenderFilter.done").click();

    await startWorkFlowAndExpectError(
      `Missing required user input: "Table and column"`,
    );
    await page.locator(getDataKey("table-and-column")).click();
    await page.locator(`[data-label="receipts.amount"]`).click();

    await startWorkFlowAndExpectError(
      `Missing required user input: "Table column value"`,
    );
    await page.locator(getDataKey("table-column-value")).click();
    await page.locator(`[data-key="regular"]`).last().click();

    await selectFileOrFolderPath("file-or-folder-path");

    await startWorkFlowAndExpectError(
      `Missing required user input: "Table column values"`,
    );
    await page.locator(getDataKey("table-column-values")).click();
    await page.locator(`[data-key="regular"]`).last().click();
    await page.keyboard.press("Escape"); // close multi select dropdown

    await selectFileOrFolderPath("file-or-folder-paths");

    await page.waitForTimeout(1e3);
    await page.getByTestId("AgenticWorkflow.start").click();

    /** Progress bar works */
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Processing user 2/",
      {
        timeout: 30e3,
      },
    );

    await page.getByTestId("AgenticWorkflow.stop").click();
    await expect(page.getByTestId("Popup.content").last()).toContainText(
      "Agentic workflow container stopped with status: aborted",
      {
        timeout: 10_000,
      },
    );
    await page
      .getByTestId("Popup.footer")
      .getByText("OK", { exact: true })
      .click();

    const runWorkflowAndExpectSuccess = async (
      shownText: string | string[] = ["ai_assistant_dashboards"],
    ) => {
      await page.getByTestId("AgenticWorkflow.start").click({
        timeout: 30e3,
      });

      await expect(page.locator(".SuccessMessage")).toContainText(
        "Workflow finished successfully",
        {
          timeout: 120e3,
        },
      );

      await page
        .getByTestId("AgenticWorkflow")
        .getByTestId("FullscreenWrapper.toggleFullscreen")
        .filter({ visible: true })
        .click();
      for (const text of Array.isArray(shownText) ? shownText : [shownText]) {
        await expect(
          page.getByTestId("AgenticWorkflow").filter({ visible: true }).last(),
        ).toContainText(text);
      }
      await page
        .getByTestId("FullscreenWrapper.toggleFullscreen")
        .filter({ visible: true })
        .last()
        .click();
    };

    /** Prevent constraint fail error */
    await runDbSql(
      page,
      `
      DROP TABLE IF EXISTS new_users;
      DELETE FROM users WHERE type = 'from-agent';
      `,
    );
    await page.waitForTimeout(1e3);
    await runWorkflowAndExpectSuccess([
      "App.css",
      "loaders.gl",
      "Failed to remove package.json",
    ]);

    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_filesystem ");
    await page.getByTestId("McpToolAccess.configure").click({ timeout: 60e3 });
    await fileBrowserGoToPath(page.getByTestId("FileTree"), [
      "ui",
      "e2e",
      "demo",
    ]);
    await page.getByText("Enable", { exact: true }).click();
    await page.waitForTimeout(1e3);

    await runWorkflowAndExpectSuccess([
      "forceConsistentCasingInFileNames",
      "tsconfig.base.json",
    ]);

    await page.waitForTimeout(1e3);
    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_noinput ");
    await runWorkflowAndExpectSuccess();

    /** Activity agent chats */
    await page.locator(getDataKey("Activity")).click({
      timeout: 10e3,
    });
    await page
      .getByTestId("AgenticWorkflow")
      .getByTestId("AgenticWorkflow.openChat")
      .first()
      .click();
    const agentChant = page.getByTestId("AskLLM.popup").nth(1);
    await expect(
      agentChant.getByTestId("ToolUseMessage.toggle").first(),
    ).toContainText("agent_goal_reached");
    await agentChant.getByTestId("Popup.close").click();

    /** Activity tool calls details */
    await page
      .getByTestId("AgenticWorkflow")
      .getByTestId("AgenticWorkflow.openToolCall")
      .getByText("fetch")
      .click();
    await expect(page.getByTestId("Popup.content").last()).toContainText(
      `https://www.prostgles.com`,
    );
    await page.getByTestId("Popup.close").last().click();

    /** Schema drift works */
    const applySchemaDriftAndStartWorkflow = async () => {
      await runDbSql(
        page,
        `
      ALTER TABLE new_users DROP COLUMN username;
      `,
      );
      await page.waitForTimeout(2e3);
      await page.getByTestId("AgenticWorkflow.start").click();
      await expect(
        page.getByTestId("AgenticWorkflowSchemaDrift"),
      ).toContainText(
        `There are tables created in this worflow that have since changed`,
      );
    };
    await applySchemaDriftAndStartWorkflow();
    await expect(page.getByTestId("AgenticWorkflowSchemaDrift")).toContainText(
      `ADD COLUMN username text`,
    );
    await page
      .getByTestId("AgenticWorkflowSchemaDrift")
      .locator(getDataKey("workflow-schema"))
      .click();
    await expect(page.getByTestId("AgenticWorkflowSchemaDrift")).toContainText(
      `CREATE TABLE IF NOT EXISTS new_users`,
    );

    await page.getByTestId("AgenticWorkflowSchemaDrift.applyPatches").click();
    await page.getByTestId("Btn.ClickConfirmation.Confirm").click();
    await page.waitForTimeout(2e3);
    await runWorkflowAndExpectSuccess();

    await runDbSql(page, `DELETE FROM users`); // reduce log size for next test
    await applySchemaDriftAndStartWorkflow();
    await page
      .getByTestId("AgenticWorkflowSchemaDrift.dropWorkflowTables")
      .click();
    await page.getByTestId("Btn.ClickConfirmation.Confirm").click();
    await page.waitForTimeout(2e3);
    await runWorkflowAndExpectSuccess();

    await page.waitForTimeout(1e3);
    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_clashing ");
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toContainText(`relation "users" already exists`, {
      timeout: 30e3,
    });

    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_invalidTable ");
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toContainText(
      `Validation error for databaseHandler usage: the following table names do not match any new tables or existing tables: ["invalid_table"]`,
      {
        timeout: 30e3,
      },
    );

    await page.waitForTimeout(1e3);
    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_invalidPermissionTable ");
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toContainText(
      `"invalid_table" does not match any new or existing tables`,
      {
        timeout: 30e3,
      },
    );
  });

  test("Disable signups", async ({ page: p }) => {
    const page = p as PageWIds;
    await loginWhenSignupIsEnabled(page);

    /** Disable signups */
    await goTo(page, "/server-settings");
    await page.locator(`[data-key="auth"]`).click();
    await page.getByTestId("EmailAuthSetup").locator("button").click();
    await page.getByText("Enable").click();
    await page.getByText("Save").click();

    /** Revert LLM signup */
    await runDbsSql(
      page,
      `
      UPDATE global_settings
      SET prostgles_registration = null
      `,
    );
    await runDbsSql(
      page,
      `
      DELETE FROM llm_credentials;
      TRUNCATE llm_chats CASCADE;
      `,
    );
  });

  test("Limit login attempts max failed limit", async ({ browser }) => {
    const page: PageWIds = await browser.newPage({
      extraHTTPHeaders: {
        "x-real-ip": "1.1.1.1",
      },
    });

    await login(page, USERS.test_user, "/login");
    await page.waitForTimeout(1500);

    await runDbsSql(
      page,
      `DELETE FROM login_attempts; UPDATE database_configs SET login_rate_limit = '{"groupBy": "x-real-ip", "maxAttemptsPerHour": 5}'`,
    );
    await page.request.post("/logout");
    await goTo(page, "/login");
    const loginAndExpectError = async (
      errorMessage: string,
      user: string,
      lpage: PageWIds,
    ) => {
      await lpage.waitForTimeout(1e3);
      await fillLoginFormAndSubmit(lpage, user);
      await lpage
        .getByTestId("Login.error")
        .waitFor({ state: "visible", timeout: 15e3 });
      await expect(
        await lpage.getByTestId("Login.error").textContent(),
      ).toContain(errorMessage);
    };
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await loginAndExpectError("Invalid credentials", "invalid", page);
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
        "x-real-ip": "1.1.1.3",
      },
    });
    await login(newPage, USERS.test_user, "/login");
    await newPage.waitForTimeout(1500);
    await runDbsSql(
      newPage,
      `DELETE FROM login_attempts; UPDATE database_configs SET login_rate_limit = '{"groupBy": "ip", "maxAttemptsPerHour": 5}'`,
    );
  });

  test("Create db with owner", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page);
    const dbName = "db_with_owner";
    await createDatabase(dbName, page, false, { name: dbName, pass: dbName });
    const currUser = await runDbSql(
      page,
      `SELECT current_user`,
      {},
      { returnType: "value" },
    );
    await expect(currUser).toEqual(dbName);

    /** Ensure realtime works and is resilient to schema change */
    const createTableQuery = `CREATE TABLE "table_name" ( id SERIAL PRIMARY KEY, title  VARCHAR(250), gencol TEXT GENERATED ALWAYS AS ( title || id::TEXT) stored);`;
    await runDbSql(page, createTableQuery);
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .locator(`[data-key="table_name"]`)
      .click();
    await page.locator(`[role="columnheader"]`).nth(1).click();
    await page.locator(`[role="columnheader"]`).nth(1).click();

    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await page
      .getByText("my_new_value_1")
      .waitFor({ state: "visible", timeout: 15e3 });

    await runDbSql(page, `DROP TABLE table_name;`);
    await page
      .getByTestId("W_Table.TableNotFound")
      .waitFor({ state: "visible", timeout: 15e3 });

    await runDbSql(page, createTableQuery);
    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await runDbSql(
      page,
      `INSERT INTO table_name (title) VALUES('my_new_value_')`,
    );
    await page
      .getByText("my_new_value_1")
      .waitFor({ state: "visible", timeout: 15e3 });

    await page
      .getByText("my_new_value_3")
      .waitFor({ state: "visible", timeout: 15e3 });
    await page.waitForTimeout(4e3);

    /** Test schema select */
    await runDbSql(
      page,
      `
      CREATE SCHEMA "MySchema";
      CREATE TABLE "MySchema"."MyTable" (
        "MyColumn" TEXT
      );
    `,
    );
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("NewConnectionForm.MoreOptionsToggle").click();
    await page.getByTestId("NewConnectionForm.schemaFilter").click();
    await page
      .getByTestId("NewConnectionForm.schemaFilter")
      .locator(`[data-key="MySchema"]`)
      .click();
    await page.keyboard.press("Escape");
    await page.getByTestId("Connection.edit.updateOrCreateConfirm").click();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .locator(`[data-key=${JSON.stringify(`"MySchema"."MyTable"`)}]`)
      .click();
    await insertRow(page, `"MySchema"."MyTable"`, { MyColumn: "some value" });
    await page
      .getByText("some value")
      .waitFor({ state: "visible", timeout: 15e3 });

    await goTo(page, "localhost:3004/connections");
    await page.waitForTimeout(4e3);
    await dropConnectionAndDatabase(dbName, page);
    await page.waitForTimeout(4e3);
    await runDbsSql(page, `DROP USER db_with_owner;`);
  });

  test("Login returnUrl", async ({ page: p }) => {
    const page = p as PageWIds;
    const requestedUrl =
      "http://localhost:3004/connections/some-connection?a=b";
    await login(page, undefined, requestedUrl);
    await page
      .getByTestId("ProjectConnection.error")
      .waitFor({ state: "visible", timeout: 15e3 });
    const currentUrl = await page.url();
    await expect(currentUrl).toEqual(requestedUrl);
  });

  test("Open redirect returnUrl", async ({ page: p }) => {
    const page = p as PageWIds;
    const requestedUrl =
      "http://localhost:3004/login?returnURL=/%2F%2Fwikipedia.org";
    await login(page, undefined, requestedUrl);
    await goTo(page, requestedUrl);
    await goTo(page, requestedUrl);
    const currentUrl = await page.url();
    await expect(currentUrl.startsWith("http://localhost:3004/")).toBe(true);
  });

  test("Test 2FA", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page);

    await page.getByRole("link", { name: "test_user" }).click();
    await page.getByTestId("MenuList").locator(`[data-key="security"]`).click();
    await page.getByTestId("Setup2FA.Enable").click();
    await page.getByTestId("Setup2FA.Enable.GenerateQR").click();
    await page.getByTestId("Setup2FA.Enable.CantScanQR").click();
    const Base64Secret = (
      await page.getByTestId("Setup2FA.Enable.Base64Secret").textContent()
    )
      ?.split(" ")
      .at(-1);
    const recoveryCode = await page
      .locator("#totp_recovery_code")
      .textContent();
    const createAndFillCode = async () => {
      await page.waitForTimeout(1200);
      const code = authenticator.generate(Base64Secret ?? "");
      await page
        .getByTestId("Setup2FA.Enable.ConfirmCode")
        .locator("input")
        .fill(code);
      await page.getByTestId("Setup2FA.Enable.Confirm").click();
    };
    await createAndFillCode();

    /** Allow 1 invalid code */
    const INVALID_CODE = "Invalid code";
    await page.waitForTimeout(300);
    const setupErrorNode = await page.getByTestId("Setup2FA.error");
    if (
      (await setupErrorNode.count()) &&
      (await setupErrorNode.textContent())?.includes(INVALID_CODE)
    ) {
      await createAndFillCode();
    }

    /** Using token */
    await login(page);
    const fillTokenAndSignIn = async () => {
      const newCode = authenticator.generate(Base64Secret ?? "");
      await page.locator("#totp_token").fill(newCode);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    };
    await fillTokenAndSignIn();
    await page.waitForTimeout(1e3);

    /** Retry once when it sometimes fails */
    const errorNode = await page.getByTestId("Login.error");
    if (
      (await errorNode.count()) &&
      (await errorNode.textContent())?.includes(INVALID_CODE)
    ) {
      await page.waitForTimeout(1e3);
      await fillTokenAndSignIn();
    }
    await page
      .getByRole("link", { name: "Connections" })
      .waitFor({ state: "visible", timeout: 15e3 });

    /** Using recovery code */
    await page.request.post("/logout");
    await login(page);
    await page
      .getByRole("button", { name: "Enter recovery code", exact: true })
      .click();
    await page.locator("#totp_recovery_code").fill(recoveryCode ?? "");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForTimeout(3e3);
    await page
      .getByRole("link", { name: "Connections" })
      .waitFor({ state: "visible", timeout: 15e3 });

    await page.getByRole("link", { name: "test_user" }).click();
    await page.getByTestId("MenuList").locator(`[data-key="security"]`).click();
    await page.getByTestId("Setup2FA.Disable").click();
  });

  test("Sample database backups", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page);

    /** Create Sample database */
    await createDatabase("sample_database", page, false);

    await page
      .getByTestId("dashboard.goToConnConfig")
      .waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.details").click();
    await page.getByTestId("config.status").click();
    await page.getByTestId("config.ac").click();
    await page.getByTestId("config.methods").click();
    await page.getByTestId("config.files").click();
    await page.getByTestId("config.bkp").click();
    await page.getByTestId("config.api").click();

    await page.getByTestId("config.bkp").click();
    /** Delete previous backups (when testing locally) */
    await deleteAllBackups(page);

    /** Test automatic backups */
    const toggleAutomaticBackups = async () => {
      await page.getByTestId("config.bkp.AutomaticBackups").click();
      await page
        .getByTestId("config.bkp.AutomaticBackups.toggle")
        .click({ timeout: 5e3 });
      await page.waitForTimeout(1e3);
      /** If it was enabled already enabled then re-enable it */
      const text = await page
        .getByTestId("config.bkp.AutomaticBackups")
        .textContent();
      if (text?.includes("Enable automatic")) {
        await toggleAutomaticBackups();
      }
    };
    await toggleAutomaticBackups();
    await page
      .getByRole("button", { name: "Restore...", exact: true })
      .waitFor({ state: "visible", timeout: 15e3 });
    await deleteAllBackups(page);

    /** Disable automatic backups */
    await toggleAutomaticBackups();
  });

  test("Delete previous users and data (to improve local tests)", async ({
    page: p,
  }) => {
    const page = p as PageWIds;

    await login(page);
    /** Delete previous user */
    await page.goto("localhost:3004/users", { waitUntil: "networkidle" });
    for (const username of [USERS.default_user, USERS.public_user]) {
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
        },
      );
      await page.reload();
      await page.waitForTimeout(1e3);
    }

    /** Delete stt_mode  */
    await runDbsSql(page, `UPDATE users SET options = null;`);

    await page.goto("localhost:3004/account", { waitUntil: "networkidle" });
    await monacoType(page, `[data-label="Options"]`, `{ `, {
      // moveCursorAfterTyping: ["Right"],
    });
    await page.keyboard.type("vst", { delay: 100 });
    await page.keyboard.press("Tab");
    await page.keyboard.type("fa", { delay: 100 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    const monacoEditor = await getMonacoEditorBySelector(
      page,
      `[data-label="Options"]`,
    );
    const text = await monacoEditor.innerText();
    /** Space charCode=32 but here we get 160 */
    if (!text.includes(`"viewedSQLTips":${String.fromCharCode(160)}false`)) {
      throw `Expected "viewedSQLTips": false in ${text}`;
    }
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page
      .getByRole("button", { name: "Update row!", exact: true })
      .click();
    await page.getByRole("link", { name: "Connections", exact: true }).click();
    await page.waitForTimeout(1e3);
    const existingTestConn = await page.getByRole("link", {
      name: TEST_DB_NAME,
      exact: true,
    });
    if (await existingTestConn.isVisible()) {
      await dropConnectionAndDatabase(TEST_DB_NAME, page);
    }
    await page.waitForTimeout(1200);
    for (const dbName of Object.values(DB_NAMES)) {
      await runDbsSql(
        page,
        `DROP DATABASE IF EXISTS ${JSON.stringify(dbName)}`,
      );
    }
  });

  test("Create and prepare test database", async ({ page: p }) => {
    const page = p as PageWIds;

    await login(page);
    await page.getByRole("link", { name: "Connections", exact: true }).click();
    await createDatabase(TEST_DB_NAME, page);
    await page
      .getByTestId("dashboard.menu.sqlEditor")
      .waitFor({ state: "visible", timeout: 15e3 });
    const editors = await page.locator(".ProstglesSQL").count();
    if (!editors) {
      await page.getByTestId("dashboard.menu.sqlEditor").click();
    }
    if (editors > 1) {
      throw "Not ok";
    }
    await page
      .getByRole("button", { name: "Ok, don't show again", exact: true })
      .click();

    /** Test sql key bindings */
    await page.keyboard.press("Alt+KeyE");
    const keybindings = ["Alt+KeyE", "Control+KeyE", "Control+Enter", "F5"];
    for (const key of keybindings) {
      const text = `hello${key}`;
      await monacoType(page, `.ProstglesSQL`, `SELECT '${text}'`);
      await page.keyboard.press(key);
      await page
        .locator(".W_SQLResults")
        .getByText(text, { exact: true })
        .waitFor({ state: "visible", timeout: 5e3 });
    }
    await monacoType(page, `.ProstglesSQL`, `SELECT pg_sleep(22)`);
    await page.keyboard.press("Alt+KeyE");
    await page.waitForTimeout(2e3);
    await page.keyboard.press("Escape");
    await page
      .locator(".W_SQLBottomBar .ErrorComponent")
      .getByText("canceling statement due to user request", { exact: true })
      .waitFor({ state: "visible", timeout: 5e3 });

    /** Create schema */
    await runSql(page, QUERIES.orders);
    await page.waitForTimeout(1e3);
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .locator(`[data-key=${JSON.stringify("orders")}]`)
      .waitFor({ state: "visible", timeout: 5e3 });
    await closeWorkspaceWindows(page);

    /** Enable file storage */
    await page
      .getByTestId("dashboard.goToConnConfig")
      .waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.files").click();
    await page.getByTestId("config.files.toggle").click();
    await page.getByTestId("config.files.toggle.confirm").click();
    await page.getByTestId("config.goToConnDashboard").click();

    /** Create table */
    await page.getByTestId("dashboard.menu.create").click();
    await page.getByText("Create table").click();
    await page
      .getByTestId("dashboard.menu.createTable.tableName")
      .getByRole("textbox")
      .fill("my_table");
    const addColumn = async (
      colName: string,
      dataType: string,
      isPkey?: boolean,
    ) => {
      await page.getByTestId("dashboard.menu.createTable.addColumn").click();
      const colEditor = await page.getByTestId("ColumnEditor.name");
      await colEditor.getByRole("textbox").fill(colName);
      await page
        .getByTestId("ColumnEditor.dataType")
        .waitFor({ state: "visible" });
      await page.keyboard.press("Tab");
      await page.keyboard.type(dataType, { delay: 300 });
      await page.keyboard.press("Enter");
      if (isPkey) {
        await page.getByText("Primary key").click();
      }
      await page
        .getByTestId("dashboard.menu.createTable.addColumn.confirm")
        .click();
    };
    await addColumn("id", "ser", true);
    await addColumn("name", "text");
    await addColumn("content", "text");
    await addColumn("secret", "text");

    /** Add icon field */
    await page.getByTestId("dashboard.menu.createTable.addColumn").click();
    await page.getByTestId("AddColumnReference").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="files.id"]`)
      .click();
    await page
      .getByTestId("dashboard.menu.createTable.addColumn.confirm")
      .click();

    /** Create table */
    await page.getByTestId("dashboard.menu.createTable.confirm").click();
    await page.getByTestId("SQLSmartEditor.Run").click();

    /** Insert records into new table */
    await page.getByRole("option").getByText("My Table").click({ delay: 200 });
    await insertRow(page, "my_table", { name: "some text" });
    const deletedRowName = "some more text";
    await insertRow(page, "my_table", { name: deletedRowName });

    /** Search row */
    await page.getByTestId("dashboard.window.toggleFilterBar").click();
    await page.locator("input#search-all").fill("2");
    await page.getByRole("option", { name: "2" }).click();
    /** This should work as well!!! */
    // await page.keyboard.press("ArrowDown", { delay: 300 });
    // await page.keyboard.press("Enter", { delay: 300 });

    /** Backup db */
    await page
      .getByTestId("dashboard.goToConnConfig")
      .waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await page
      .getByRole("button", { name: "Create backup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start backup", exact: true })
      .click();
    await page.getByText("Completed");

    /** Delete row */
    await page.getByTestId("config.goToConnDashboard").click();
    await page.getByTestId("dashboard.window.viewEditRow").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete!", exact: true }).click();
    await page.waitForTimeout(200);

    /** Restore db */
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.bkp").click();
    await restoreFromBackup(page);

    /** Go to dashboard. Deleted row should be there */
    await page.waitForTimeout(2200);
    await page.getByTestId("config.goToConnDashboard").click();
    await page
      .getByText(deletedRowName)
      .waitFor({ state: "visible", timeout: 15e3 });
    await page.waitForTimeout(1200);

    /** SearchAll for that row as well */
    await page.keyboard.press("Control+Shift+KeyF");
    await page.getByTestId("SearchAll").fill(deletedRowName);
    await page.waitForTimeout(1100);
    await page
      .getByText(`name: ${deletedRowName}`)
      .waitFor({ state: "visible", timeout: 15e3 });
    await page.keyboard.press("Escape");

    /** Test Access control */
    await page.goto("localhost:3004/users", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await insertRow(
      page,
      "users",
      { username: USERS.default_user, password: USERS.default_user },
      true,
    );
    await insertRow(
      page,
      "users",
      { username: USERS.default_user1, password: USERS.default_user1 },
      true,
    );
    // await insertRow(page, "users", { username: USERS.public_user, password: USERS.public_user, type: "public" }, true);
  });

  test("Set access rules", async ({ page: p }) => {
    const page = p as PageWIds;

    await createAccessRuleForTestDB(page, "default");

    await setTableRule(
      page,
      "my_table",
      {
        select: { excludedFields: ["secret"] },
        insert: { forcedData: { name: "abc" }, excludedFields: ["secret"] },
        update: { forcedData: { name: "abc" }, excludedFields: ["secret"] },
        delete: { forcedFilter: [{ fieldName: "name", value: "abc" }] },
      },
      false,
    );
    await setTableRule(
      page,
      "orders",
      { select: {}, update: {}, insert: {}, delete: {} },
      false,
    );
    await setTableRule(
      page,
      "files",
      { select: {}, update: {}, insert: {}, delete: {} },
      true,
    );

    /** Expect LLM to ask for API credentials */
    await page.getByTestId("AskLLM").click();
    await page.getByTestId("AskLLM.popup").waitFor({ state: "visible" });
    await page.getByTestId("SetupLLMCredentials").waitFor({ state: "visible" });
    const chatSend = await page
      .getByTestId("AskLLM.popup")
      .getByTestId("Chat.send")
      .count();
    await expect(chatSend).toBe(0);
    await page.getByTestId("Popup.close").click();

    /** Setup LLM */
    await enableAskLLM(page, 0);

    /** Expect LLM to work */
    const [{ isOk }] = await getLLMResponses(page, ["hehhehey"]);
    expect(isOk).toBe(true);

    /** Clear prev chats to ensure llm limit test works */
    await runDbsSql(page, `TRUNCATE llm_chats CASCADE;`);

    /** Save access rule  */
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  test("Default user has correct permissions", async ({ page: p }) => {
    const page = p as PageWIds;

    await page.request.post("/logout");
    await login(page, USERS.default_user);

    await page.getByRole("link", { name: "Connections" }).click();
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

  test("Default user1 has correct permissions", async ({ page: p }) => {
    const page = p as PageWIds;

    await page.request.post("/logout");
    await login(page, USERS.default_user1);

    await page.getByRole("link", { name: "Connections" }).click();
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

  test("Admin user (test_user) can see all data", async ({ page: p }) => {
    const page = p as PageWIds;

    await page.request.post("/logout");
    await login(page, USERS.test_user);
    await page.getByRole("link", { name: "Connections" }).click();
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
    await page.locator(`.ExistingAccessRules_Item_Header`).click();
    await setTableRule(
      page,
      "files",
      { select: {}, update: {}, insert: {}, delete: {} },
      true,
    );
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  /** Used in debugging  User can insert and view */
  // test("RESEST User can insert and view files through allowed reference columns", async ({
  //   page: p,
  // }) => {
  //   const page = p as PageWIds;

  //   await login(page, USERS.test_user);
  //   await page.getByRole("link", { name: "Connections" }).click();
  //   await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();
  //   await page.waitForTimeout(1e3);
  //   await runDbSql(page, `DELETE FROM my_table WHERE id > 4;`);
  //   await runDbSql(
  //     page,
  //     `SELECT setval(
  //     pg_get_serial_sequence('my_table', 'id'),
  //     COALESCE((SELECT MAX(id) FROM my_table), 0),
  //     true
  //   );`,
  //   );
  // });

  test("User can insert and view files through allowed reference columns", async ({
    page: p,
  }) => {
    const page = p as PageWIds;

    await login(page, USERS.default_user);
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();
    await page.waitForTimeout(1e3);

    await expect(page.getByText(fileName)).toHaveCount(0);

    await clickInsertRow(page, "my_table");
    await selectAndUpsertFile(
      page,
      (page) => page.getByTestId("SmartFormFieldOptions.AttachFile").click(),
      () =>
        expect(
          page.getByTestId("Popup.content").locator("img"),
          // Must have blob src attribute
        ).toHaveAttribute("src", /^\s*blob:/),
    );
    const imgSrc = await page
      .getByTestId("Popup.content")
      .locator("img")
      .getAttribute("src");
    await expect(imgSrc).toContain("blob:");
    const nodes = await page.getByText(fileName).innerHTML();
    console.log({ nodes });
    await expect(page.getByText(fileName)).toHaveCount(1);
    await page.waitForTimeout(1e3);

    const myTableContainer = page.locator(`[data-table-name="my_table"]`);

    // Required to ensure it is not obscured by the insert btn
    await myTableContainer.getByTestId("dashboard.window.fullscreen").click();
    await myTableContainer
      .getByTestId("dashboard.window.viewEditRow")
      .last()
      .click();

    /** Toggling records by keyboard works */
    await page.waitForTimeout(1e3); // Wait for listeners to attach?!
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(`#my_table-id`)).toHaveValue("4");
    await page.keyboard.press("ArrowRight");

    await expect(
      page.getByTestId("Popup.content").locator("img"),
    ).toHaveAttribute(
      "src",
      // Inserted url starts with /prostgles_storage

      /^\/prostgles_storage/,
    );

    // Deleting works
    await page
      .locator(getDataKey("files_id"))
      .getByTestId("FormField.clear")
      .click();
    await page.getByTestId("SmartForm.update").click();
    await page
      .getByRole("button", { name: "Update row!", exact: true })
      .click();
    await page.waitForTimeout(500);

    /** If it fails you might need to exit my_table fullscreen and it will be in the top files table */
    await expect(page.getByText(fileName)).toHaveCount(0);

    // Updating row with file works
    await page.getByTestId("dashboard.window.viewEditRow").last().click();
    await selectAndUpsertFile(
      page,
      (page) => page.getByTestId("SmartFormFieldOptions.AttachFile").click(),
      () =>
        expect(
          page.getByTestId("Popup.content").locator("img"),
        ).toHaveAttribute("src", /^\s*blob:/),
      true,
    );
    await expect(page.getByText(fileName)).toHaveCount(1);
  });

  test("Table tests", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();

    const wspName = "Table tests";
    /** Delete existing duplicate workspace */
    await page.getByTestId("WorkspaceMenuDropDown").click();
    await page.waitForTimeout(1e3);
    let deleted = false;
    await forEachLocator(
      page,
      async () => {
        //.getByText("WorkspaceMenu.SearchList")
        const res = await page
          .getByTestId("WorkspaceMenu.SearchList")
          .locator(`[data-key=${JSON.stringify(wspName)}]`);
        return res;
      },
      async (item) => {
        const deleteWspBtn = await item.getByTestId("WorkspaceDeleteBtn");
        deleted = true;
        await deleteWspBtn.click();
        await page.waitForTimeout(555);
        await page.getByTestId("WorkspaceDeleteBtn.Confirm").click();
        await page.waitForTimeout(555);
      },
    );
    if (!deleted) {
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
      ${QUERIES.orders}
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
        await (window as any).sql(query);
      } catch (err) {
        document.body.innerText = JSON.stringify(err);
      }
    }, query);

    await getSearchListItem(page, { dataKey: "users" }).click();
    const usersTable = await getTableWindow(page, "users");

    /** Test pagination */
    const pageInput = await usersTable.getByTestId("Pagination.page");
    await expect(await pageInput.inputValue()).toBe("1");
    await expect(await pageInput.getAttribute("min")).toBe("1");
    await expect(await pageInput.getAttribute("max")).toBe("7");
    await expect(
      await usersTable.getByTestId("Pagination.pageCountInfo").textContent(),
    ).toBe(`7 pages  (100 rows)`);
    await usersTable.getByTestId("Pagination.lastPage").click();
    await pageInput.scrollIntoViewIfNeeded();
    await expect(await pageInput.inputValue()).toBe("7");
    await usersTable.getByTestId("Pagination.firstPage").click();
    await expect(await pageInput.inputValue()).toBe("1");
    await usersTable.getByTestId("Pagination.nextPage").click();
    await expect(await pageInput.inputValue()).toBe("2");
    await usersTable.getByTestId("Pagination.lastPage").click();
    await usersTable.getByTestId("Pagination.pageSize").click();
    await page
      .getByTestId("Pagination.pageSize")
      .locator(getDataKey("50"))
      .click();
    await expect(await pageInput.inputValue()).toBe("2");
    await expect(
      await usersTable.getByTestId("Pagination.pageCountInfo").textContent(),
    ).toBe(`2 pages  (100 rows)`);

    await usersTable.getByTestId("AddColumnMenu").click();
    await getSearchListItem(page.getByTestId("AddColumnMenu"), {
      dataKey: "Referenced",
    }).click();
    await page.getByTestId("JoinPathSelectorV2").click();
    await page.waitForTimeout(1e3);
    await getSearchListItem(page.getByTestId("JoinPathSelectorV2"), {
      dataKey: "orders",
    }).click();
    await page.getByTestId("LinkedColumn.ColumnList.toggle").click();
    await page.waitForTimeout(1e3);
    await getSearchListItem(page, { dataKey: "total_cost" })
      .getByTestId("SummariseColumn.toggle")
      .click();
    await page.waitForTimeout(1e3);
    await getSearchListItem(page.getByTestId("FunctionSelector"), {
      dataKey: "$sum",
    }).click();
    await page.getByTestId("SummariseColumn.apply").click();
    await page
      .getByTestId("LinkedColumn.ColumnListMenu")
      .getByTestId("Popup.close")
      .click();
    await page.getByTestId("LinkedColumn.Add").click();

    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddChartMenu.Map").click();
    await page
      .getByTestId("AddChartMenu.Map")
      .getByRole("option")
      .filter({ hasText: "> orders (delivery_address)" })
      .click();
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();
    await page.waitForTimeout(1e3);
    await usersTable.getByTestId("AddChartMenu.Timechart").click();
    await page
      .getByTestId("AddChartMenu.Timechart")
      .getByRole("option")
      .getByText("> orders (created_at)", { exact: true })
      .click();
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.window.detachChart").click();

    /** Set count all to ensure the W_TimeChart.ActiveRow below works */
    // await page.getByTestId("TimeChartLayerOptions.aggFunc").click();
    // await page.getByTestId("TimeChartLayerOptions.aggFunc.select").click();
    // await page.getByTestId("TimeChartLayerOptions.aggFunc.select").locator(`[data-key="$countAll"]`).click();
    // await page.getByTestId("Popup.close").click();

    await page.waitForTimeout(5e3);
    /** Mouse move is needed to show tooltip and to trigger re-render so that _renderedData.x,y are defined */
    await page.mouse.move(700, 111);
    await page.mouse.move(700, 150);
    await page.mouse.click(700, 150);
    await page
      .getByTestId("W_TimeChart.ActiveRow")
      .waitFor({ state: "visible", timeout: 5e3 });
    /** Test W_TimeChart activeRow crossfilter */
    const {
      data = [],
      x = -99,
      y = -99,
    } = await page.evaluate(async () => {
      try {
        const timeChartRef = document.querySelector(".W_TimeChart")!;
        const bbox = timeChartRef.getBoundingClientRect();
        const data = (timeChartRef as any)._renderedData as {
          x: number;
          y: number;
          value: number;
        }[];
        return { data, x: bbox.x, y: bbox.y };
      } catch (err: any) {
        document.body.innerText = err.toString() + JSON.stringify(err);
        return {};
      }
    });
    const [firstPoint, secondPoint] = data;
    if (
      typeof firstPoint?.x !== "number" ||
      typeof secondPoint?.x !== "number"
    ) {
      console.error("firstPoint or secondPoint missing:", {
        firstPoint,
        secondPoint,
      });
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
    if (await brush.isVisible()) {
      await brush.locator("button").click();
    }

    /**
     * Ensure card view works
     */
    await usersTable.getByTestId("dashboard.window.menu").click();
    await page.waitForTimeout(1e3);
    await page.getByText("Display options").click();
    await page.getByTestId("table.options.displayMode").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="card"]`)
      .click();
    await page.getByTestId("table.options.cardView.groupBy").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="type"]`)
      .click();
    await page.getByTestId("table.options.cardView.orderBy").click();
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-key="position"]`)
      .click();
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
      const firstGroupFirstRow = await firstGroup
        .getByTestId("CardView.row")
        .first();
      const secondGroupFirstRow = await secondGroup
        .getByTestId("CardView.row")
        .first();
      const draggedText = await firstGroupFirstRow
        .getByTitle("id")
        .textContent();
      const targetText = await secondGroupFirstRow
        .getByTitle("id")
        .textContent();
      const firstDragHandle = await firstGroupFirstRow.getByTestId(
        "CardView.DragHeader",
      );
      const secondDragHandle = await secondGroupFirstRow.getByTestId(
        "CardView.DragHeader",
      );

      const box1 = await firstDragHandle.boundingBox();
      const box2 = await secondDragHandle.boundingBox();
      if (!box1 || !box2) {
        throw "box1 or box2 missing";
      }
      await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2, {
        steps: 22,
      });
      await firstDragHandle.hover();
      await page.waitForTimeout(1e3);
      await page.mouse.down({ button: "left" });
      await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2, {
        steps: 111,
      });
      await page.mouse.up({ button: "left" });
      await page.waitForTimeout(5e3);

      const newTargetText = await secondGroup
        .getByTestId("CardView.row")
        .first()
        .getByTitle("id")
        .textContent();
      return { draggedText, newTargetText };
    };

    await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    const { draggedText, newTargetText } = await swapFirstTwoRows();
    await page.waitForTimeout(1e3);
    await expect(draggedText).toEqual(newTargetText);
    await page.waitForTimeout(2e3);
  });

  test("API tests", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME, exact: true }).click();
    await page
      .getByTestId("dashboard.goToConnConfig")
      .waitFor({ state: "visible", timeout: 10e3 });
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.api").click();

    await page
      .getByRole("button", { name: "Create token", exact: true })
      .click();
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await page.getByTestId("Popup.close").click();
    await page.getByRole("button", { name: "Examples", exact: true }).click();
    await page
      .getByRole("button", { name: "Download code sample", exact: true })
      .click();
  });

  test("SQL Autocomplete", async ({ page: p }) => {
    const page = p as PageWIds;
    const sqlTestTimeout = { total: 9 * 6e4, sql: 8 * 6e4 };
    test.setTimeout(sqlTestTimeout.total);

    await page.request.post("/logout");
    await login(page, USERS.test_user);
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();

    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    await page.waitForTimeout(3000);

    /** Ensure SQL Autocomplete works */
    await closeWorkspaceWindows(page);
    await page.getByTestId("dashboard.menu.sqlEditor").click();
    await page.getByTestId("dashboard.window.menu").click();
    await page.getByText("General").click();

    for (const _ of new Array(5).fill(1)) {
      await page.getByText("TEST", { exact: true }).click();
      await page.waitForTimeout(100);
    }

    const startSqlTest = async () =>
      new Promise(async (resolve, reject) => {
        page.on("dialog", (dialog) => {
          const msg = dialog.message();
          console.log("1", msg);
          if (msg.includes("does not match the expected")) {
            reject(msg);
            throw msg;
          }
          if (msg === "Demo finished successfully") {
            return resolve(1);
          }
          return dialog.accept();
        });
      });
    await startSqlTest();
  });

  test("Admin can create and drop connections", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user);
    const dbName = "my_new_db";
    await createDatabase(dbName, page);
    await page.getByTestId("dashboard.menu").waitFor({ state: "visible" });
    await page.goBack();

    const { connectionSelector } = await dropConnectionAndDatabase(
      dbName,
      page,
    );
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    const deletedConnection = await page.locator(connectionSelector);
    await expect(await deletedConnection.count()).toEqual(0);
  });

  test("Set public user access rules", async ({ page: p }) => {
    const page = p as PageWIds;

    await createAccessRuleForTestDB(page, "public");
    await setTableRule(
      page,
      "my_table",
      {
        select: {},
      },
      false,
    );
    await setTableRule(
      page,
      "orders",
      { select: {}, update: {}, insert: {}, delete: {} },
      false,
    );
    await setTableRule(
      page,
      "files",
      { select: {}, update: {}, insert: {}, delete: {} },
      true,
    );
    await enableAskLLM(page, 4, true);
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  test("Public user can access all allowed sections without issues", async ({
    page: p,
  }) => {
    const page = p as PageWIds;
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .waitFor({ state: "visible", timeout: 10e3 });
    await openTable(page, "my_tabl");

    /** Ask LLM limit */
    const [response1, response2, response3] = await getLLMResponses(page, [
      "hey",
      "hey",
      "hey",
    ]);
    await expect(response1.isOk).toBe(true);
    await expect(response2.isOk).toBe(true);
    await expect(response3.isOk).toBe(true);
  });

  test("Public user ask llm limit", async ({ page: p }) => {
    const page = p as PageWIds;
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .waitFor({ state: "visible", timeout: 10e3 });
    const [response1, response2] = await getLLMResponses(page, ["hey", "hey"]);
    await expect(response1.isOk).toBe(true);
    await expect(response2.isOk).toBe(false);
  });

  test("MCP Servers", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "localhost:3004/login");
    await page.getByRole("link", { name: "Connections" }).click();
    await page.getByRole("link", { name: TEST_DB_NAME }).click();

    await runDbsSql(
      page,
      `
      UPDATE mcp_servers SET enabled = false WHERE name = 'myServer';
      DELETE FROM mcp_servers WHERE name = 'myServer';
    `,
    );

    await page.getByTestId("AskLLM").click();
    await page.getByTestId("AskLLM.popup").waitFor({ state: "visible" });
    await page.getByTestId("LLMChatOptions.MCPTools").click();
    await page.getByTestId("AddMCPServer.Open").click();
    await monacoType(
      page,
      ".SmartCodeEditor",
      JSON.stringify(
        {
          mcpServers: {
            myServer: {
              command: "npx",
              args: [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "ALLOWED_DIR",
              ],
              env: {
                MY_TOKEN: "<YOUR_TOKEN>",
              },
            },
          },
        },
        null,
        2,
      ),
      {
        deleteAllAndFill: true,
        /** For some reason an extra bracket is inserted */
        pressAfterTyping: ["Backspace"],
      },
    );

    await page.locator(".SwitchToggle " + getDataKey("ALLOWED_DIR")).click();
    await page.getByTestId("AddMCPServer.Add").click();
    await page.getByTestId("AddMCPServer.Add").waitFor({ state: "detached" });
    await page
      .getByTestId("SmartCardList")
      .locator(getDataKey("myServer"))
      .getByTitle("Press to enable")
      .click();

    await page.getByLabel("ALLOWED_DIR").fill("/prostgles-mcp-test");
    await page.getByText("Enable", { exact: true }).click();
  });

  test("Web template build works", async ({ page: p }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "localhost:3004/login");
    await page.getByRole("link", { name: "cloud" }).click();
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.webApp").click();
    const createFromTemplateBtn = page.getByTestId(
      "WebAppConfig.createFromTemplate",
    );
    await createFromTemplateBtn.click();
    await page.waitForTimeout(1e3);
    await page
      .getByTestId("Btn.ClickConfirmation.Confirm")
      .click({ timeout: 10e3 });
    await expect(createFromTemplateBtn).toBeEnabled({ timeout: 5e3 });
    // Page will reload
    await page.waitForTimeout(500);
    await clickAndWait(page.getByTestId("WebAppConfig.build"));
    await clickAndWait(page.getByTestId("WebAppConfig.test"));
    await page.getByTestId("FullscreenWrapper.toggleFullscreen").click();
    await page.locator(getDataKey("Components")).click();
    await page.locator(getDataKey("SampleComponent")).click();
    await page.locator(getDataKey("Files")).click();
    await page.locator(getDataLabel("client")).click();
    await page
      .locator(getDataLabel("client") + " " + getDataLabel("package.json"))
      .getByTestId("FileTreeNode.header")
      .click();
    await page.waitForTimeout(1e3);
    // await page.getByTestId("FileTree").locator("input").fill("pack");
    // await page.keyboard.press("Enter");
    await expect(page.getByTestId("MonacoEditor")).toContainText(
      "vite-project",
    );
  });

  test("show error when on webdev prompt and webapp not templated", async ({
    page: p,
  }) => {
    const page = p as PageWIds;
    await login(page, USERS.test_user, "localhost:3004/login");
    await page.getByRole("link", { name: "sample_database" }).click();
    await page.getByTestId("AskLLM").click();
    await page.getByTestId("AskLLM.popup").waitFor({ state: "visible" });
    await setPromptByText(page, "Web app development", false);
    const alertLocator = page.getByText(
      "WebDev MCP Server requires a templated web app",
    );
    await expect(alertLocator).toBeVisible();

    /** Closing it works */
    await page.getByTestId("Popup.close").last().click();
    await expect(alertLocator).not.toBeAttached();
  });

  test("Web template works", async ({ page: p }) => {
    const page = p as PageWIds;
    await goTo(page, "localhost:3005");
    await expect(page.locator("body")).toContainText("Not logged in");
    await expect(page.locator("body")).toContainText("Available tables:");
  });

  test("Web app dev mode works", async ({ page: p }) => {
    const page = p as PageWIds;
    const cwd = resolve(join(__dirname, "..", "demo", "client"));
    console.log("Starting dev server in cwd:", cwd);
    const devProc = spawn("npm", ["run", "dev"], {
      cwd,
      shell: true,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      await new Promise((resolve, reject) => {
        devProc.stdout?.on("data", (data) => {
          const str = data.toString();
          console.log("devProc stdout:", str);
          if (str.includes("5173")) {
            resolve(1);
          }
        });
        setTimeout(() => reject(new Error("Dev server timeout")), 30_000);
      });
      await goTo(page, "localhost:5173");
      await expect(page.locator("body")).toContainText("Not logged in");
      await expect(page.locator("body")).toContainText("Available tables:");
    } finally {
      console.log("Killing dev proc tree:", devProc.pid);
      process.kill(-devProc.pid!, "SIGTERM"); // still leaves a zombie node process?!
    }
  });
});
