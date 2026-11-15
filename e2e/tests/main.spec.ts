import { chromium, expect, test, type Locator } from "./utils/fixtures";
import type { Route } from "@playwright/test";
import { generate } from "otplib";
import { createHash } from "node:crypto";
import { speechToTextTest } from "testAskLLM/speechToTextTest";

import { execSync, spawn } from "child_process";
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
import { setupAskLLMToolUse, testAskLLMCode } from "./testAskLLM/testAskLLM";
import {
  getCommandElemSelector,
  getDataKey,
  getDataLabel,
} from "./utils/Testing";
import {
  addFileToChat,
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
  getLoginSubmitButton,
  getMonacoEditorBySelector,
  getMonacoValue,
  getSelector,
  getTableWindow,
  getTimeout,
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
  scrollElementIntoView,
  selectAndUpsertFile,
  sendAskLLMMessage,
  setModelByText,
  setPromptByText,
  setTableRule,
  setupMagicLinkAuth,
  setWspColLayout,
  toggleMCPTools,
  TWENTY_SECONDS_OR_MORE,
  typeConfirmationCode,
  uploadFile,
} from "./utils/utils";

import { MINUTE } from "common/utils";
import { DEFAULT_AGENT_MODEL } from "../../server/dist/server/src/serverFunctions/askLLM/refreshModels";
import type { SchemaShape } from "../../client/src/dashboard/SchemaGraph/ERDSchema/useSchemaShapes";

const schemaGraphTestDbName = "financial.sql";
const DB_NAMES = {
  test: TEST_DB_NAME,
  food_delivery: "food_delivery",
  // sample_database: "sample_database",
  video_demo_database: "prostgles_video_demo",
};
const backupDir = resolve(__dirname, "../demo/backups");

const viewPortSize = { width: 1080, height: 1080 };
test.use({
  /** Increase size to ensure agentic workflow fits all logs */
  viewport: viewPortSize,
});

test.describe.configure({ mode: "serial" });

test.describe("Main test", () => {
  if (process.env.ONLY_VIDEO) {
    test.skip();
  }
  let smtp: Awaited<ReturnType<typeof startMockSMTPServer>> | undefined;
  const getSMTPServer = () => {
    if (!smtp) throw new Error("SMTP server has not started");
    return smtp;
  };

  test.beforeAll(async () => {
    smtp = await startMockSMTPServer({
      disabledCommands: ["AUTH", "STARTTLS"],
    });
  });

  test.afterAll(async () => {
    await smtp?.close();
  });

  test.beforeEach(async ({ page, browser }, testInfo) => {
    page.on("console", console.log);
    page.on("pageerror", console.error);
    await page.waitForTimeout(200);

    if (testInfo.title.includes("[no-backup]")) return;

    // Do auth + backup/restore in an isolated helper context
    const helperContext = await browser.newContext();
    const helperPage = (await helperContext.newPage()) as PageWIds;

    await login(helperPage, USERS.test_user, "/auth/login");
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
    await helperPage.request.post("/auth/logout").catch(() => {});
    await helperContext.close();
  });

  const deleteAllBackups = async (page: PageWIds) => {
    await page.getByTestId("config.bkp").click();
    await page
      .getByTestId("BackupsControls.Completed")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
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
    const page = p;
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
    await page
      .getByTestId("dashboard.menu.quickSearch")
      .waitFor({ state: "visible" });

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
    await expect(newPage.locator("body")).toContainText(
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
    const page = p;

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
        .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    };

    await goTo(page);
    await goToWorkspace();

    await page.waitForTimeout(500);
    if (!localNoAuthSetup) {
      await goTo(page);
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

    await expect(formField).toHaveText(`Username${USERS.test_user}`);
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
    const page = p;
    await login(page, USERS.test_user, "/auth/login");
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
    await expect(
      page.getByTestId("BackupControls.Restore").first(),
    ).toBeVisible(TWENTY_SECONDS_OR_MORE);

    await page.getByTestId("config.goToConnDashboard").click();
    await expect(table).toBeVisible();
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
    const page = p;
    await login(page, USERS.test_user, "/auth/login");
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
    await expect(table).toBeVisible();
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

    await login(page, USERS.test_user, "/auth/login");
    await openConnection(page, "Prostgles UI state");
    // await page.getByTestId("config.goToConnDashboard").click();
    await expect(table).toBeVisible();
  });

  test("Create db for Schema graph", async ({ page: p }) => {
    const page = p;
    await login(page, USERS.test_user);

    await createDatabase(schemaGraphTestDbName, page, true);
  });

  test("Schema graph renders and can be zoomed and panned", async ({
    page: p,
  }) => {
    const page = p;
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
      const drawnInfo = await page.evaluate(
        () => document.querySelector("canvas")?._drawn,
      );
      if (!drawnInfo) throw new Error("Schema graph has not rendered");
      // The generic canvas declaration omits the diagram's table metadata.
      return {
        ...drawnInfo,
        shapes: drawnInfo.shapes as unknown as SchemaShape[],
      };
    };
    const initialShapesInfo = await getDrawnInfo();

    /** Scroll wheel zoom works */
    await page.mouse.move(300, 300);
    await page.mouse.wheel(100, 0);

    await page.waitForTimeout(1500);

    const zoomedInShapesInfo = await getDrawnInfo();
    await expect(zoomedInShapesInfo.zoomScale).toBeGreaterThan(
      initialShapesInfo.zoomScale,
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
    const page = p;
    await login(page, USERS.test_user, "/auth/login");

    for (const pageWithTabs of ["/server-settings", "/account"] as const) {
      await goTo(page, pageWithTabs);

      /* Routes share the same gap between the navbar and their content. */
      await expect
        .poll(() =>
          page
            .locator(".Tabs")
            .first()
            .evaluate((tabs) => {
              const navbar = document.querySelector('[data-command="NavBar"]');
              if (!navbar) throw new Error("Navbar not found");
              return (
                tabs.getBoundingClientRect().top -
                navbar.getBoundingClientRect().bottom
              );
            }),
        )
        .toBe(16);

      if (pageWithTabs === "/account") {
        await page.getByTestId("ViewMoreSmartCardList").first().click();
        await expect(
          page.getByTestId("Popup.content").getByTestId("SmartCardList"),
        ).toContainText("Highest access level");
        await page.getByTestId("Popup.close").click();
      }
      const tabItems = await page.getByTestId("MenuList").locator("li").all();
      for (const tabItem of tabItems) {
        await expect(tabItem).toHaveAttribute("data-key", /.+/);
        await expect(tabItem).toHaveText(/.+/);
        const tabText = await tabItem.textContent();
        await tabItem.click();
        await page.waitForTimeout(500);
        await expect(page.locator(".Tabs_Content h2").first()).toContainText(
          tabText!,
        );
      }
    }
  });

  test("Email password registration setup", async ({ page: p }) => {
    const page = p;

    await login(page);

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
    await expect(input).toHaveValue("http://localhost:3004");
    const signupMode = page.getByTestId("AuthProviderSetup.signupMode");
    if ((await signupMode.innerText()) !== "Public signup") {
      const appBeforeSignupUpdate = await page
        .getByTestId("App")
        .evaluateHandle((element) => element);
      await signupMode.click();
      await page.locator('[data-key="public"]').click();
      /* Wait for the app refresh, which resets expanded sections. */
      await page.waitForFunction(
        (element) => !element.isConnected,
        appBeforeSignupUpdate,
      );
      await appBeforeSignupUpdate.dispose();
    }
    await expect(signupMode).toHaveText("Public signup");
    await page.getByTestId("EmailAuthSetup").locator("button").click();
    await page.getByTestId("EmailAuthSetup.SignupType").click();
    await page.locator(`[data-key="withPassword"]`).click();
    const fillHostAndTest = async (hostVal: string) => {
      await page.getByTestId("EmailSMTPAndTemplateSetup").click();
      await page.getByText("Email Provider").click();
      await page.locator(`[data-label="Host"] input`).fill(hostVal);
      await page.locator("input#smtp-Port").fill(String(getSMTPServer().port));
      await page
        .getByTestId("EmailSMTPAndTemplateSetup")
        .getByText("Save")
        .click();
    };
    await fillHostAndTest("invalid-smtp.invalid");
    await page.getByText("Enabled").click();
    await page.getByText("Save").click({ timeout: 10e3 });
    const errNode = await page.getByTestId("EmailAuthSetup.error");
    await expect(errNode).toContainText("getaddrinfo E");
    await expect(errNode).toContainText("invalid-smtp.invalid");
    await fillHostAndTest("127.0.0.1");
    await page.waitForTimeout(1500);
    const errNode1 = await page.getByTestId("EmailAuthSetup.error");
    await expect(errNode1).toHaveCount(0);
  });

  test("Email password registration", async ({ page: p, browser }) => {
    const page = await browser.newPage();
    const newPage = p;
    await login(page);

    await goTo(newPage, "/auth/login");

    /* Unknown emails fail password login and are throttled. */
    await newPage.locator("#username").fill(USERS.new_user);
    await newPage.locator("#password").fill(USERS.new_user);
    const start = Date.now();
    await newPage.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(newPage.getByTestId("Login.error")).toHaveText(
      "Invalid credentials",
    );
    await expect(Date.now() - start).toBeGreaterThan(499);
    await newPage.reload();

    /** Passwords do not match registration check */
    await newPage.getByTestId("Login.toggle").click();
    await expect(newPage.locator("#new-password")).toBeVisible();
    await newPage.locator("#username").fill(USERS.new_user);
    await newPage.locator("#password").fill(USERS.new_user);
    await newPage.getByRole("button", { name: "Sign up" }).click();
    await expect(newPage.getByTestId("Login.error")).toHaveText(
      "Passwords do not match",
    );
    await newPage.locator("#new-password").fill(USERS.new_user);
    await newPage.getByRole("button", { name: "Sign up" }).click();
    await expect(
      newPage.getByTestId("AuthNotifPopup").getByTestId("Popup.content"),
    ).toHaveText(
      "Email verification sent. Open the verification url or enter the code to confirm your email",
    );
    await newPage.getByRole("button", { name: "Ok" }).click();

    const newUser = await runDbsSql(
      page,
      `SELECT * FROM users WHERE username = $1`,
      [USERS.new_user],
      { returnType: "row" },
    );
    const code = getSMTPServer().getLatestCode();
    expect(newUser?.registration?.code_hash).toBe(
      createHash("sha256").update(code).digest("hex"),
    );
    await expect(typeof code).toBe("string");
    await expect(code.length).toBe(6);
    expect(getSMTPServer().getEmails().at(-1)).toContain(code);
    expect(getSMTPServer().getEmails().at(-1)).toContain(
      `To: ${USERS.new_user}`,
    );
    await newPage.locator("#email-verification-code").fill(code);
    await newPage.getByRole("button", { name: "Confirm email" }).click();
    await expect(
      newPage.getByTestId("AuthNotifPopup").getByTestId("Popup.content"),
    ).toHaveText("Your email has been confirmed. You can now sign in");
    await newPage.getByRole("button", { name: "OK", exact: true }).click();
    await expect(newPage).toHaveURL("http://localhost:3004/auth/login");

    await fillLoginFormAndSubmit(newPage, USERS.new_user);

    await newPage.getByTestId("App.colorScheme").waitFor({ state: "visible" });
  });

  test("Enable email magic link registrations & Translations", async ({
    page: p,
  }) => {
    const page = p;

    await login(page);
    await goTo(page, "/server-settings");
    await page.locator(`[data-key="auth"]`).click();
    await setupMagicLinkAuth(page, getSMTPServer().port);

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
    const newPage = p;
    const page: PageWIds = await browser.newPage();

    /**
     * Can still login with password with email magic link registrations
     */
    await goTo(page, "/auth/login");
    await page.locator("#username").fill(USERS.test_user);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#password").waitFor({ state: "visible" });
    await page.locator("#password").fill(USERS.test_user);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByTestId("App.colorScheme").waitFor({ state: "visible" });

    await goTo(newPage, "/auth/login");

    await newPage.locator("#username").fill(USERS.new_user1);
    await newPage.getByRole("button", { name: "Continue" }).click();

    await expect(
      newPage.getByTestId("AuthNotifPopup").getByTestId("Popup.content"),
    ).toHaveText("Magic link sent. Open the url from your email to login");
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
    const code = getSMTPServer().getLatestCode();
    expect(newUser?.registration?.code_hash).toBe(
      createHash("sha256").update(code).digest("hex"),
    );
    await expect(typeof code).toBe("string");
    expect(getSMTPServer().getEmails().at(-1)).toContain(code);
    expect(getSMTPServer().getEmails().at(-1)).toContain(
      `To: ${USERS.new_user1}`,
    );
    await goTo(
      newPage,
      `/auth/magic-link?code=${code}&email=${USERS.new_user1}`,
    );

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

  test("Theme selector and system theme work", async ({ page: p }) => {
    const page = p;
    await page.emulateMedia({ colorScheme: "dark" });
    await goTo(page);
    await page.locator("html.dark-theme").waitFor({ state: "visible" });
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(26, 25, 25)",
    );

    await page.emulateMedia({ colorScheme: "light" });
    await page.locator("html.light-theme").waitFor({ state: "visible" });
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(244, 245, 247)",
    );

    await login(page);
    for (const theme of ["dark", "light"] as const) {
      await page.getByTestId("App.colorScheme").click();
      await page.locator(`[data-key="${theme}"]`).click();
      await expect(page.locator("html")).toHaveClass(`${theme}-theme`);
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("theme")))
        .toBe(theme);
    }

    await page.reload();
    await expect(page.locator("html")).toHaveClass("light-theme");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass("light-theme");
    await page.getByTestId("App.colorScheme").click();
    await page.locator('[data-key="from-system"]').click();
    await expect(page.locator("html")).toHaveClass("dark-theme");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass("light-theme");
  });

  test("Setup Free LLM assistant signup", async ({ page: p }) => {
    const page = p;
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
    await setupMagicLinkAuth(page, getSMTPServer().port);
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
    await page.getByTestId("WebApp.directory").hover();
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
    const page = p;
    await page.goto("http://localhost:3005");
    await expect(page.locator("body")).toContainText("example_table");
  });

  test("Setup Free LLM assistant functions", async ({ page: p }) => {
    const page = p;
    await loginWhenSignupIsEnabled(page);

    /** Create cloud db */
    await page.getByRole("link", { name: "Cloud" }).click();
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.api").click();

    /** Add server-side func */
    await page.getByTestId("config.methods").click();

    /** This timeout is crucial in ensuring monaco editor shows suggestions */
    await page.getByText("Create function").click(TWENTY_SECONDS_OR_MORE);
    await page.locator("input#function_name").fill("askLLM");
    await page.waitForTimeout(1e3);
    await monacoType(page, ".MethodDefinition", "dbo.t", {
      deleteAll: false,
      pressBeforeTyping: ["ArrowUp"],
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
      pressBeforeTyping: ["ArrowUp"],
    });
    await page.keyboard.press("Tab");

    /** Ensure db schema suggestions work */
    const initialCode =
      "export const run: ProstglesMethod = async (args, { db, dbo, user, callMCPServerTool }) => {\n dbo.tx \n}";
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
      await page
        .getByRole("button", { name: "Add new item", exact: true })
        .click();
      await page.getByLabel("Argument name").last().fill(argName);
      await page.getByLabel("Data type").last().click();
      await page.locator(`[data-key="any"]`).click();
      /* Selecting a type must retain the argument name and finish adding it. */
      await expect(
        page.getByRole("heading", { name: "Add new item", exact: true }),
      ).toBeHidden();
      await expect(page.getByLabel("Argument name").last()).toHaveValue(
        argName,
      );
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
    /** This is crucial in ensuring monaco automatic text placeholder replacements don't break the code */
    await setupAskLLMToolUse(page);

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
    await page
      .getByTestId("SetupLLMCredentials.free")
      .click({ ...TWENTY_SECONDS_OR_MORE });
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
    const freeLLMCode = getSMTPServer().getLatestCode();
    expect(llmUser?.registration?.code_hash).toBe(
      createHash("sha256").update(freeLLMCode).digest("hex"),
    );
    await expect(typeof freeLLMCode).toBe("string");
    expect(getSMTPServer().getEmails().at(-1)).toContain(freeLLMCode);
    expect(getSMTPServer().getEmails().at(-1)).toContain(
      `To: ${USERS.free_llm_user1}`,
    );
    await page.locator("input#otp-code").fill(freeLLMCode);
    await page.getByTestId("ProstglesSignup.continue").click();
    await page.waitForTimeout(1e3);
    await page.locator(".ProstglesSignup").waitFor({ state: "detached" });
  });

  test("Test LLM responses and tools", async ({ page: p }) => {
    const page = p;
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

    await test.step("Chat selector searches titles and message content", async () => {
      const chatSelector = page.getByTestId("LLMChat.select");
      const originalChatId = await chatSelector.getAttribute("data-key");
      await sendAskLLMMessage(page, "Violet search phrase");
      await newChat(page);
      const newChatId = await chatSelector.getAttribute("data-key");
      await chatSelector.click();
      const searchList = page.getByTestId("SearchList").filter({
        has: chatSelector,
      });
      const searchInput = searchList.getByRole("textbox");
      const chatOptions = searchList.getByRole("option");
      const originalChatOption = chatOptions.filter({ hasText: userMessage });

      for (const term of ["HEY", "violet search phrase", "FREE AI ASSISTANT"]) {
        await searchInput.fill("");
        await expect(chatOptions).toHaveCount(2);
        await searchInput.fill(term);
        await expect(chatOptions).toHaveCount(1);
        await expect(originalChatOption).toHaveAttribute(
          "data-key",
          originalChatId!,
        );
        await expect(chatSelector).toHaveAttribute("data-key", newChatId!);
      }

      await searchInput.fill("no matching chat content");
      await expect(chatOptions).toHaveCount(0);
      await searchInput.fill("");
      await expect(chatOptions).toHaveCount(2);
      await searchInput.fill("violet search phrase");
      await originalChatOption.click();
      await expect(chatSelector).toHaveAttribute("data-key", originalChatId!);
      await expect(page.getByTestId("Chat.messageList")).toContainText(
        "Violet search phrase",
      );
      await chatSelector.click();
      await expect(searchInput).toHaveValue("");
      await expect(chatOptions).toHaveCount(2);
      await originalChatOption.click();
      await runDbsSql(page, "DELETE FROM llm_chats WHERE id = $1", [newChatId]);
    });

    /**
     * Ensure draft message is correctly handled
     * */
    const textArea = page.getByTestId("Chat.textarea");
    await expect(textArea).toHaveValue("");
    const draft = "Unsent draft should not be resent after clearing";
    await textArea.fill(draft);
    await expect
      .poll(async () =>
        runDbsSql(
          page,
          "SELECT count(*)::int FROM llm_chats WHERE currently_typed_message = $1",
          [draft],
          { returnType: "value" },
        ),
      )
      .toBe(1);
    await page.getByTestId("AskLLM.popup").getByTestId("Popup.close").click();
    await page.getByTestId("AskLLM").click();
    await expect(textArea).toHaveValue(draft);
    const userMessages = page.locator(".message:not(.incoming)");
    const messageCount = await userMessages.count();
    await textArea.fill("");
    await textArea.press("Enter");
    await page.waitForTimeout(500);
    await expect(userMessages).toHaveCount(messageCount);

    /** Test request tool access */
    await sendAskLLMMessage(page, " request_tool_access ", false);
    await expect(textArea).toHaveValue("", { timeout: 1000 });
    await expect(textArea).toBeDisabled();
    await page
      .getByTestId("RequestToolAccess.Approve")
      .click({ ...TWENTY_SECONDS_OR_MORE });

    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Requested access to websearch tool and read access to receipts table in the database.`,
      { ...TWENTY_SECONDS_OR_MORE },
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

    await setModelByText(page, "luna");

    await expect(page.getByTestId("LLMChatOptions.MCPTools")).toContainText(
      "11",
    );
    await sendAskLLMMessage(page, " task ", false);

    await page
      .getByTestId("RequestToolAccess.Approve")
      .click(TWENTY_SECONDS_OR_MORE);
    await expect(page.getByTestId("RequestToolAccess")).toContainText(
      "Added tool access",
      { ...TWENTY_SECONDS_OR_MORE },
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Added fetch tool access and database permissions for receipts table.",
      { ...TWENTY_SECONDS_OR_MORE },
    );

    await expect(page.getByTestId("LLMChatOptions.MCPTools")).toContainText(
      "13",
    );

    const dbToolsBtn = await page
      .getByTestId("LLMChatOptions.DatabaseAccess")
      .locator("button");
    await expect(dbToolsBtn).toContainClass("btn-color-action");

    // await addExistingDatabase(page, "food_delivery");
    await createDatabase("food_delivery", page, true);
    await page.getByTestId("AskLLM").click();
    await newChat(page);

    await setPromptByText(page, "dashboard");
    await runDbSql(
      page,
      `
      CREATE TABLE IF NOT EXISTS hygiene_ratings (
        id SERIAL PRIMARY KEY,
        restaurant_name TEXT,
        hygiene_score INTEGER,
        restaurant_id int4 NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        inspection_date DATE
      );
      `,
    );

    await sendAskLLMMessage(
      page,
      "I need some useful dashboards to track performance",
    );
    await page
      .getByTestId("AskLLMChat.LoadSuggestedDashboards")
      .click(TWENTY_SECONDS_OR_MORE);

    /* Generated dashboards appear in the selector and open their saved views. */
    const workspaceSelector = page.getByTestId("WorkspaceMenuDropDown");
    await expect(workspaceSelector).toHaveText(
      "Order Management",
      TWENTY_SECONDS_OR_MORE,
    );
    await workspaceSelector.click();
    const workspaceList = page
      .getByRole("dialog")
      .getByTestId("WorkspaceMenu.list");
    await expect(workspaceList).toContainText(
      "Customer Insights",
      TWENTY_SECONDS_OR_MORE,
    );

    await workspaceList.locator(getDataKey("Restaurant Performance")).click();
    await page
      .getByTestId("TableBody")
      .locator(".ProgressBar")
      .first() // Table cell barcharts
      // .scrollIntoViewIfNeeded({ timeout: 60e3 });
      .waitFor({ state: "visible", timeout: 60e3 });

    /* Unloading generated dashboards removes them from the workspace menu. */
    await page.getByTestId("AskLLM").click();
    await Promise.all([
      page.waitForEvent("load"),
      page
        .getByTestId("AskLLMChat.UnloadSuggestedDashboards")
        .click(TWENTY_SECONDS_OR_MORE),
    ]);
    await workspaceSelector.click();
    await expect(workspaceList).toBeVisible();
    await expect(workspaceList).not.toContainText("Customer Insights");

    await page.waitForTimeout(2e3);

    await goTo(page, "/connections");
    await dropConnectionAndDatabase("food_delivery", page, true);
    await page.waitForTimeout(2e3);
  });

  test("Document to markdown service and conversion works", async ({
    page: p,
  }) => {
    const page = p;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();

    /**
     * Only test locally due to service image size
     */
    if (!process.env.CI) {
      const pdfFilePath = join(
        __dirname,
        "..",
        "tests",
        "testAskLLM",
        "sample.pdf",
      );
      await addFileToChat(page, pdfFilePath);
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
      await expect(page.getByLabel("Convert docs to markdown")).toBeChecked(
        getTimeout(4 * 60e3),
      );

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
      await expect(itemBtn).toBeVisible({ ...TWENTY_SECONDS_OR_MORE });

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
      await addFileToChat(page, pdfFilePath);

      await expect(itemBtn).toBeVisible(TWENTY_SECONDS_OR_MORE);

      await page.getByTestId("Chat.send").click();

      /** In chat file visible */
      const inChatItemBtn = page
        .getByTestId("Chat.messageList")
        .getByTestId("LLMChatMessageContent.textDocument")
        .getByText("sample.pdf");
      await expect(inChatItemBtn).toBeVisible(TWENTY_SECONDS_OR_MORE);

      /** Agent was provided the text content */
      await expect(page.getByTestId("Chat.messageList")).toContainText(
        "This is a sample PDF",
        TWENTY_SECONDS_OR_MORE,
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
    const page = p;
    // page.setDefaultTimeout(TWENTY_SECONDS_OR_MORE.timeout);
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();
    await newChat(page);
    await toggleMCPTools(page, ["fetch"]);

    const mcpFetchAndExpect = async (
      expectedMsg: string,
      msgType: "last-msg" | "last-tool-use",
    ) => {
      await sendAskLLMMessage(page, " mcp ", false);
      await page
        .getByTestId("AskLLMToolApprover.AllowOnce")
        .click(TWENTY_SECONDS_OR_MORE);
      await expect(
        page.getByRole("button", { name: "Approve Once" }),
      ).toHaveCount(0, TWENTY_SECONDS_OR_MORE);
      const mcpToolUse = await getAskLLMLastMessage(page);

      const locatorToCheck =
        msgType === "last-msg" ? mcpToolUse : (
          page.getByTestId("AskLLM.popup").getByTestId("ToolUseMessage").last()
        );
      await expect(locatorToCheck).toContainText(expectedMsg, {
        ...TWENTY_SECONDS_OR_MORE,
      });
    };
    await mcpFetchAndExpect(
      "is blocked by MCP server configuration",
      "last-tool-use",
    );

    /** Must allow internal subnets */
    await page
      .locator(
        getCommandElemSelector("LLMChatOptions.EnabledMcpServer") +
          getDataKey("web"),
      )
      .click();
    await page.getByTestId("MCPServerConfigButton").click();
    await page.getByLabel("Block internal subnets").click();
    await page.getByTestId("MCPServerConfig.save").click();
    await page.waitForTimeout(1e3);
    await page.getByTestId("Popup.close").last().click();
    await mcpFetchAndExpect("successfully fetched the login page", "last-msg");

    /** Ensure chat name updates based on first message */
    await expect(page.getByTestId("LLMChat.select")).toContainText("mcp");

    await sendAskLLMMessage(page, " mcp ", false);
    await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    await page.getByTestId("Popup.close").last().click();
    await sendAskLLMMessage(page, " interrupt tool call ");
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Tool use requests were interrupted by the user",
      {
        ...TWENTY_SECONDS_OR_MORE,
      },
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "free ai assistant interrupt tool call",
    );

    await sendAskLLMMessage(page, " get_specific_tool_schemas ");
    // Auto-approved by default
    await page
      .getByTestId("ToolUseMessage.toggle")
      .getByText(
        'prostgles-ui--get_specific_tool_schemas\nmcpServerTools: {"web":{"fetch":1}}',
      )
      .click(TWENTY_SECONDS_OR_MORE);
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Fetches from a URL`,
    );

    await page.waitForTimeout(1e3);
    await sendAskLLMMessage(page, " mcpplaywright ");
    await page
      .getByTestId("ToolUseMessage.toggleGroup")
      .getByText("2 tool calls")
      .last()
      .click(TWENTY_SECONDS_OR_MORE);
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_navigate" is invalid. Try enabling and reloading the tools`,
    );
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      `Tool name "playwright--browser_snapshot" is invalid. Try enabling and reloading the tools`,
    );

    /* Use the same installed Chromium as the browser tests, without a desktop display. */
    await runDbsSql(
      page,
      "UPDATE mcp_servers SET env = env || $1::jsonb WHERE name = 'playwright'",
      [
        JSON.stringify({
          PLAYWRIGHT_MCP_EXECUTABLE_PATH: chromium.executablePath(),
          PLAYWRIGHT_MCP_HEADLESS: "true",
          PLAYWRIGHT_MCP_ISOLATED: "true",
        }),
      ],
    );
    await enableMCPServers(page, ["playwright"]);
    await page
      .getByText("browser_tabs")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE }); // wait for tools list to refresh
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

    await sendAskLLMMessage(page, " mcpplaywright ", false);
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
    await scrollElementIntoView(lastToolUseBtn);
    await page.waitForTimeout(1e3);
    await lastToolUseBtn.click();
    await page.waitForTimeout(1e3);
    /** Can be flaky */
    await expect(page.getByTestId("MarkdownMonacoCode").last()).toContainText(
      "Prostgles UI",
      { ...TWENTY_SECONDS_OR_MORE },
    );
    await expect(page.getByTestId("MarkdownMonacoCode").last()).toContainText(
      "http://localhost:3004/auth/login",
      { ...TWENTY_SECONDS_OR_MORE },
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
    ).toHaveCount(5, getTimeout(30e3));
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
      `Maximum total cost of the chat (5) reached. Current cost: 5.`,
      { ...TWENTY_SECONDS_OR_MORE },
    );

    /** Test max speculative chat cost */
    await newChat(page);
    const costOfNodeModulesToolResult = 0.84;
    const maxCost = costPerMsg * 2 + 0.8 * costOfNodeModulesToolResult;
    await page.getByTestId("LLMChatOptions.toggle").click();
    await page.waitForTimeout(1500);
    await fillSmartForm(page, "llm_chats", {
      max_total_cost_usd: maxCost.toString(),
    });
    await page.waitForTimeout(1500);
    await page.getByTestId("Popup.close").last().click();
    await page.waitForTimeout(1500);
    await page.getByTestId("LLMChatOptions.toggle").click();
    await expect(
      page.locator("input#llm_chats-max_total_cost_usd"),
    ).toHaveValue(maxCost.toString());
    await page.getByTestId("Popup.close").last().click();

    /** Install electron to ensure node_modules exists */
    await execSync("npm install", {
      cwd: resolve(__dirname, "../../electron"),
    });
    await enableMCPServers(page, ["filesystem"], true);
    await fileBrowserGoToPath(page.getByTestId("FileTree"), [
      "ui",
      "electron",
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
      `Maximum total cost of the chat (${maxCost}) will be reached after sending this message`,
      getTimeout(30e3),
    );
  });

  test("Test LLM sandbox tools", async ({ page: p }) => {
    const page = p;
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await page.getByTestId("AskLLM").click();
    await setPromptByText(page, "dashboard");
    /* MCP Docker sandbox */
    await newChat(page);
    /* Prompt persists from the prev chat */
    await expect(page.getByTestId("LLMChatOptions.Prompt")).toContainText(
      "Create dashboards",
    );

    await page.getByTestId("LLMChatOptions.MCPTools").click(getTimeout(10e3));
    await page
      .locator(getDataKey("prostgles-ui"))
      .getByText("run_code_in_sandbox", { exact: true })
      .waitFor({ state: "visible", ...getTimeout(15e3) });
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
      await sendAskLLMMessage(page, " mcpsandbox ", false);
      await page
        .getByTestId("AskLLMToolApprover.AllowOnce")
        .click({ ...TWENTY_SECONDS_OR_MORE });
      await expect(page.getByTestId("Chat.messageList")).toContainText(
        "create a container that runs",
        getTimeout(60e3),
      );
      await page.waitForTimeout(3e3);

      await prepareCb?.();

      await page
        .getByTestId("DockerSandboxCreateContainer.stop")
        .waitFor({ state: "detached", ...getTimeout(40e3) });
      await page.waitForTimeout(3e3);

      for (const res of Array.isArray(result) ? result : [result]) {
        await expect(
          locator ?? page.getByTestId("ToolUseMessage").last(),
        ).toContainText(res, {
          ...TWENTY_SECONDS_OR_MORE,
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
          .click({ ...TWENTY_SECONDS_OR_MORE });
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
      .click(TWENTY_SECONDS_OR_MORE);

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

    /** SQL result columns must access values by name, including falsy values. */
    await sendAskLLMMessage(page, " sql_preview ");
    await page.getByTestId("ToolUseMessage.toggle").last().click();
    const sqlPreview = page
      .getByTestId("ToolUseMessage")
      .last()
      .getByTestId("MarkdownMonacoCode");
    const expectedSqlCells = ["preview row", "0", "false", "NULL"];
    await expect(sqlPreview.getByRole("columnheader")).toHaveText([
      "display label",
      "total",
      "enabled",
      "missing",
    ]);
    await expect(sqlPreview.getByRole("cell")).toHaveText(expectedSqlCells);
    await sqlPreview.getByRole("button", { name: "Close result" }).click();
    await sqlPreview
      .getByRole("button", { name: "Execute SQL (With rollback)", exact: true })
      .click();
    await expect(sqlPreview.getByRole("cell")).toHaveText(expectedSqlCells);

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
      getTimeout(30e3),
    );
    await page.getByTestId("ToolUseMessage.toggleGroup").last().click();
    await expect(
      page
        .getByTestId("Chat.messageList")
        .getByText(
          'Tool name "web--fetch" is not allowed. Must enable it for this chat',
        ),
    ).toHaveCount(3, getTimeout(30e3));

    await newChat(page);
    await toggleMCPTools(page, ["fetch"]);
    await sendAskLLMMessage(page, " parallel_calls ", false);

    /** Should not request approval for the other 2 requests */
    await page.getByTestId("AskLLMToolApprover.AllowAlways").click();

    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Fetched in parallel successfully",
      getTimeout(30e3),
    );
    await page.getByTestId("ToolUseMessage.toggleGroup").last().click();

    await expect(
      page.locator(
        getCommandElemSelector("ToolUseMessage.toggle") +
          `[data-color="default"]`,
      ),
    ).toHaveCount(3, getTimeout(30e3));

    await newChat(page);
    await toggleMCPTools(page, ["websearch", "get_snapshot"]);
    await page.waitForTimeout(7e3); // wait for the server to start
    await sendAskLLMMessage(page, " websearch ", false);
    await page
      .getByTestId("AskLLMToolApprover.AllowAlways")
      .click(TWENTY_SECONDS_OR_MORE);
    await page.getByTestId("AskLLMToolApprover.AllowAlways").click();
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Search done.",
      getTimeout(30e3),
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
      false,
    );
    await page
      .getByTestId("AskLLMToolApprover.AllowAlways")
      .click(getTimeout(10e3));
  });

  test("Agentic workflow", async ({ page: p }) => {
    const page = p;
    if (process.env.CI) {
      test.setTimeout(10 * 60e3);
    }
    await loginWhenSignupIsEnabled(page);

    await openConnection(page, "cloud");
    await closeWorkspaceWindows(page);
    await page.getByTestId("AskLLM").click();

    await setupAskLLMToolUse(page);

    /** Test ask tool */
    await newChat(page);
    await sendAskLLMMessage(page, " ask_tool ", false);
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
      await page.getByTestId("AgenticWorkflow.start").click(getTimeout(60e3));
      await expect(page.getByTestId("Alert")).toContainText(
        errorMessage,
        getTimeout(60e3),
      );
      await page.getByText("OK", { exact: true }).click();
      await expect(page.getByTestId("UserInput")).toBeVisible();
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
      const pathInput = page.locator(getDataKey(fileTreeKey));
      const path =
        fileTreeKey.includes("file") ?
          ["ui", "client", "package.json"]
        : ["ui", "client", "src"];
      for (const clearSelection of [true, false]) {
        await pathInput.click();
        await fileBrowserGoToPath(page.getByTestId("FileTree").first(), path);
        if (isMultiple) {
          await page.getByText("Done").first().click();
        }
        if (clearSelection) {
          /* Cleared paths must be omitted when starting the workflow. */
          await page
            .locator(".PopupMenu_triggerWrapper")
            .filter({ has: pathInput })
            .getByRole("button", { name: "Clear", exact: true })
            .click();
          await expect(page.getByTestId("FileTree")).toHaveCount(0);
          await startWorkFlowAndExpectError(
            `Missing required user input: ${JSON.stringify(label)}`,
          );
        }
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
    /* Multiselects share compact filter rows and keep the popup's focus corners. */
    const multiSelectPopup = page.getByTestId("Popup.content").last();
    const multiSelectSearch = multiSelectPopup.locator(
      ".SearchList_InputWrapper",
    );
    await expect(
      multiSelectPopup.getByTestId("SearchList.Input"),
    ).toBeFocused();
    for (const corner of ["left", "right"]) {
      await expect(multiSelectSearch).toHaveCSS(
        `border-top-${corner}-radius`,
        await multiSelectPopup.evaluate(
          (element, corner) =>
            getComputedStyle(element).getPropertyValue(
              `border-top-${corner}-radius`,
            ),
          corner,
        ),
      );
    }
    const regularOption = multiSelectPopup.locator('[data-key="regular"]');
    await expect(regularOption.locator(".LABELWRAPPER span")).toHaveCSS(
      "font-size",
      "14px",
    );
    await expect(regularOption.locator(".ROWINNER")).toHaveCSS(
      "opacity",
      "0.75",
    );
    await regularOption.click();
    await expect(regularOption.locator(".ROWINNER")).toHaveCSS("opacity", "1");
    await page.keyboard.press("Escape"); // close multi select dropdown

    await selectFileOrFolderPath("file-or-folder-paths");

    await page.waitForTimeout(1e3);
    await page.getByTestId("AgenticWorkflow.start").click();

    /** Progress bar works */
    await expect(page.getByTestId("Chat.messageList")).toContainText(
      "Processing user 2/",
      getTimeout(30e3),
    );

    await page.getByTestId("AgenticWorkflow.stop").click();
    await expect(page.getByTestId("AgenticWorkflowActions")).toContainText(
      "Stopped",
      getTimeout(10e3),
    );

    const runWorkflowAndExpectSuccess = async (
      shownText: string | string[] = ["<!DOCTYPE html>"],
    ) => {
      await page.getByTestId("AgenticWorkflow.start").click(getTimeout(30e3));

      await expect(page.locator(".SuccessMessage")).toContainText(
        "Workflow finished successfully",
        getTimeout(120e3),
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
    await page
      .locator(getDataKey("filesystem"))
      .getByTestId("McpToolAccess.configure")
      .click(getTimeout(60e3));
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
    await page.locator(getDataKey("Activity")).click(getTimeout(10e3));
    await page
      .getByTestId("AgenticWorkflow")
      .getByTestId("AgenticWorkflow.openChat")
      .first()
      .click();
    const agentChant = page.getByTestId("AskLLM.popup").nth(1);
    await expect(agentChant.getByTestId("Chat.messageList")).toContainText(
      "Agent goal reached",
    );
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
    ).toContainText(`relation "users" already exists`, getTimeout(30e3));

    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_invalidTable ");
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toContainText(
      // `Validation error for databaseHandler usage: the following table names do not match any new tables or existing tables: ["invalid_table"]`,
      `Table "invalid_table" is used in the workflow but not included in tablePermissions`,
      getTimeout(30e3),
    );

    await page.waitForTimeout(1e3);
    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_invalidPermissionTable ");
    await expect(
      page.getByTestId("AgenticWorkflow.validationErrorLogs"),
    ).toContainText(
      `"invalid_table" does not match any new or existing tables`,
      getTimeout(30e3),
    );

    await page.waitForTimeout(1e3);
    await newChat(page);
    await sendAskLLMMessage(page, " agentic_workflow_agent_failure ");
    await page.getByTestId("AgenticWorkflow.start").click(getTimeout(90e3));
    await expect(page.getByTestId("Alert")).toContainText(
      `Agentic workflow container stopped with status: error`,
      getTimeout(30e3),
    );
    await page.getByText("OK", { exact: true }).click();
    await expect(page.getByTestId("AgenticWorkflow")).toContainText(
      `The agent failed to complete the task`,
    );
    await expect(page.getByTestId("AgenticWorkflow")).not.toContainText(
      `"<!DOCTYPE html>"`,
    );
  });

  test("Create agent shows and uses the default model and parent chat MCP config", async ({
    page: p,
  }) => {
    const page = p;

    await loginWhenSignupIsEnabled(page);
    await openConnection(page, "cloud");
    await closeWorkspaceWindows(page);
    await page.getByTestId("AskLLM").click();

    await setupAskLLMToolUse(page);

    await newChat(page);
    await sendAskLLMMessage(page, "Agent defaults test setup");
    const parentChat: { id: number } = await runDbsSql(
      page,
      `SELECT chat_id AS id FROM llm_messages
       WHERE message @> $1::jsonb ORDER BY id DESC LIMIT 1`,
      [JSON.stringify([{ type: "text", text: "Agent defaults test setup" }])],
      { returnType: "row" },
    );
    const chatConfig: { id: number } = await runDbsSql(
      page,
      `INSERT INTO mcp_server_configs (server_name, config)
       VALUES ('web', $1) ON CONFLICT (server_name, config)
       DO UPDATE SET config = EXCLUDED.config RETURNING id`,
      [
        {
          type: "local",
          value: {
            access: { mode: "allow", urls: ["agent-defaults.example"] },
          },
        },
      ],
      { returnType: "row" },
    );
    await runDbsSql(
      page,
      `INSERT INTO llm_chats_allowed_mcp_tools (chat_id, server_name, tool_id, server_config_id)
       SELECT $1, server_name, id, $2 FROM mcp_server_tools
       WHERE server_name = 'web' AND name = 'fetch'
       ON CONFLICT (chat_id, tool_id) DO UPDATE SET server_config_id = EXCLUDED.server_config_id`,
      [parentChat.id, chatConfig.id],
    );

    await sendAskLLMMessage(page, " create_agent ", false);
    const agent = page.getByTestId("AskLLM.popup").getByTestId("Agent");
    await expect(agent.getByTestId("LLMChatOptions.Model")).toContainText(
      DEFAULT_AGENT_MODEL,
      TWENTY_SECONDS_OR_MORE,
    );
    await expect(agent.getByTestId("McpToolAccess.configure")).toContainText(
      "agent-defaults.example",
    );
    await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .click(TWENTY_SECONDS_OR_MORE);
    await agent
      .getByText("View activity", { exact: true })
      .click(TWENTY_SECONDS_OR_MORE);

    await expect(page.getByTestId("Popup.content").last()).toContainText(
      "Agent goal reached",
      getTimeout(30e3),
    );
    const agentConfig = await runDbsSql(
      page,
      `SELECT models.name AS "modelName", tools.server_config_id AS "configId"
       FROM llm_chats AS chats
       JOIN llm_models AS models ON models.id = chats.model
       JOIN llm_chats_allowed_mcp_tools AS tools ON tools.chat_id = chats.id
       WHERE chats.parent_chat_id = $1 AND tools.server_name = 'web'`,
      [parentChat.id],
      { returnType: "row" },
    );
    expect(agentConfig).toEqual({
      modelName: DEFAULT_AGENT_MODEL,
      configId: chatConfig.id,
    });
  });

  test("Disable signups", async ({ page: p }) => {
    const page = p;
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

    await login(page, USERS.test_user, "/auth/login");
    await page.waitForTimeout(1500);

    await runDbsSql(
      page,
      `DELETE FROM login_attempts; UPDATE database_configs SET login_rate_limit = '{"groupBy": "x-real-ip", "maxAttemptsPerHour": 5}'`,
    );
    await page.request.post("/auth/logout");
    await goTo(page, "/auth/login");
    const loginAndExpectError = async (
      errorMessage: string,
      user: string,
      lpage: PageWIds,
    ) => {
      await lpage.waitForTimeout(1e3);
      await fillLoginFormAndSubmit(lpage, user);
      await lpage
        .getByTestId("Login.error")
        .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
      await expect(lpage.getByTestId("Login.error")).toContainText(
        errorMessage,
        TWENTY_SECONDS_OR_MORE,
      );
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
    await login(newPage, USERS.test_user, "/auth/login");
    await newPage.waitForTimeout(1500);
    await runDbsSql(
      newPage,
      `DELETE FROM login_attempts; UPDATE database_configs SET login_rate_limit = '{"groupBy": "ip", "maxAttemptsPerHour": 5}'`,
    );
  });

  test("Create db with owner", async ({ page: p }) => {
    const page = p;
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
  });

  test("Ensure realtime works and is resilient to schema change", async ({
    page: p,
  }) => {
    const page = p;
    await login(page);
    const dbName = "db_with_owner";
    await openConnection(page, "db_with_owner");
    await runDbSql(
      page,
      `DROP TABLE IF EXISTS "table_name"; 
      DROP TABLE IF EXISTS "MySchema"."MyTable"; 
      DROP SCHEMA IF EXISTS "MySchema" CASCADE;`,
    );
    /** Ensure realtime works and is resilient to schema change */
    const createTableQuery = `CREATE TABLE "table_name" ( id SERIAL PRIMARY KEY, title  VARCHAR(250), gencol TEXT GENERATED ALWAYS AS ( title || id::TEXT) stored);`;
    await runDbSql(page, createTableQuery);
    await page.reload();
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
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

    await runDbSql(page, `DROP TABLE table_name;`);
    await page
      .getByTestId("W_Table.TableNotFound")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

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
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

    await page
      .getByText("my_new_value_3")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
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
    await page.waitForTimeout(3e3);
    await page.getByTestId("dashboard.goToConnConfig").click();
    await page.getByTestId("config.details").click();
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
      .locator(getDataKey(`"MySchema"."MyTable"`))
      .click();
    await insertRow(page, `"MySchema"."MyTable"`, { MyColumn: "some value" });
    await page
      .getByText("some value")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

    await goTo(page, "localhost:3004/connections");
    await page.waitForTimeout(4e3);
    await dropConnectionAndDatabase(dbName, page);
    await page.waitForTimeout(4e3);
    await runDbsSql(page, `DROP USER db_with_owner;`);
  });

  test("Login returnUrl", async ({ page: p }) => {
    const page = p;
    const requestedUrl =
      "http://localhost:3004/connections/some-connection?a=b";
    await login(page, undefined, requestedUrl);
    await page
      .getByTestId("ProjectConnection.error")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    await expect(page).toHaveURL(requestedUrl);
  });

  test("Open redirect returnUrl", async ({ page: p }) => {
    const page = p;
    const requestedUrl =
      "http://localhost:3004/auth/login?returnURL=/%2F%2Fwikipedia.org";
    await login(page, undefined, requestedUrl);
    await goTo(page, requestedUrl);
    await goTo(page, requestedUrl);
    await expect(page).toHaveURL(
      (url) => url.origin === "http://localhost:3004",
    );
  });

  test("Test 2FA", async ({ page: p }) => {
    const page = p;

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
      const code = await generate({ secret: Base64Secret ?? "" });
      await page
        .getByTestId("Setup2FA.Enable.ConfirmCode")
        .locator("input")
        .fill(code);
      await page.getByTestId("Setup2FA.Enable.Confirm").click();
    };
    await createAndFillCode();

    /** Allow 1 invalid code */
    const INVALID_CODE = "Invalid totp code";
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
      const newCode = await generate({ secret: Base64Secret ?? "" });
      await page.locator("#totp_token").fill(newCode);
      await getLoginSubmitButton(page).click();
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
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

    /** Using recovery code */
    await page.request.post("/auth/logout");
    await login(page);
    await page
      .getByRole("button", { name: "Enter recovery code", exact: true })
      .click();
    await page.locator("#totp_recovery_code").fill(recoveryCode ?? "");
    await getLoginSubmitButton(page).click();
    await page.waitForTimeout(3e3);
    await page
      .getByRole("link", { name: "Connections" })
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });

    await page.getByRole("link", { name: "test_user" }).click();
    await page.getByTestId("MenuList").locator(`[data-key="security"]`).click();
    await page.getByTestId("Setup2FA.Disable").click();
  });

  test("Sample database backups", async ({ page: p }) => {
    const page = p;

    await login(page);

    await test.step(
      "Connections load while the logo request is pending",
      async () => {
        let pendingLogoRequest: Route | undefined;
        const logoPattern = "**/prostgles-logo.svg";
        await page.route(logoPattern, (route) => {
          pendingLogoRequest = route;
        });
        try {
          await goTo(page, "/connections");
          await expect.poll(() => !!pendingLogoRequest).toBe(true);
          await expect(
            page.getByTestId("ConnectionServer.add").first(),
          ).toBeVisible();
        } finally {
          await pendingLogoRequest?.continue();
          await page.unroute(logoPattern);
        }
      },
      { timeout: 10_000 },
    );

    /** Create Sample database */
    await createDatabase("sample_database", page, false);

    await page
      .getByTestId("dashboard.goToConnConfig")
      .waitFor({ state: "visible", ...getTimeout(10e3) });
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
        .click(getTimeout(10e3));
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
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    await deleteAllBackups(page);

    /** Disable automatic backups */
    await toggleAutomaticBackups();
  });

  test("Delete previous users and data (to improve local tests)", async ({
    page: p,
  }) => {
    const page = p;

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
        () => page.getByTestId("SmartCard.viewEditRow"),
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
    const page = p;

    await login(page);
    await page.getByRole("link", { name: "Connections", exact: true }).click();
    await createDatabase(TEST_DB_NAME, page);
    await page
      .getByTestId("dashboard.menu.sqlEditor")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
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
    const page = p;

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
    const chatSend = page.getByTestId("AskLLM.popup").getByTestId("Chat.send");
    await expect(chatSend).toHaveCount(0);
    await page.getByTestId("Popup.close").click();

    /** Setup LLM */
    await enableAskLLM(page, 0);

    /** Expect LLM to work */
    const [response] = await getLLMResponses(page, ["hehhehey"]);
    expect(response).toMatchObject({ isOk: true });

    /** Clear prev chats to ensure llm limit test works */
    await runDbsSql(page, `TRUNCATE llm_chats CASCADE;`);

    /** Save access rule  */
    await page.getByTestId("config.ac.save").click();
    await page.waitForTimeout(2e3);
  });

  test("Default user has correct permissions", async ({ page: p }) => {
    const page = p;

    /** Increase test time due to doc processing */
    test.setTimeout(7 * MINUTE);

    await page.request.post("/auth/logout");
    await login(page, USERS.default_user);

    await openConnection(page, TEST_DB_NAME);
    await setWspColLayout(page);
    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "fil");
    await page.waitForTimeout(1000);

    await uploadFile(page);

    /* Ensure that the file is uploaded and visible in the table */
    await expect(getTableWindow(page, "files").getByText(fileName)).toBeVisible(
      TWENTY_SECONDS_OR_MORE,
    );

    await insertRow(page, "my_table", { content: USERS.default_user });
    await insertRow(page, "orders", { status: "incomplete" });
    await expect(page.getByText("secret")).toHaveCount(0);
  });

  test("Default user1 has correct permissions", async ({ page: p }) => {
    const page = p;

    await page.request.post("/auth/logout");
    await login(page, USERS.default_user1);

    await openConnection(page, TEST_DB_NAME);
    await setWspColLayout(page);

    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "fil");
    await page.waitForTimeout(1000);

    /* The filter bar picker opens with the selected file and resets on close. */
    const filesTableWindow = getTableWindow(page, "files");
    const filesFilterBar = filesTableWindow.getByTitle("Edit filters");
    if (!(await filesFilterBar.isVisible())) {
      await filesTableWindow
        .getByTestId("dashboard.window.toggleFilterBar")
        .click();
    }
    const filterBarFilePicker = filesFilterBar.getByTestId("FileBtn");
    const filePreview = page.locator(".SmartForm .FileInputMedia");
    await filterBarFilePicker
      .locator("input")
      .setInputFiles(resolve(__dirname, "..", fileName));
    await expect(filePreview).toContainText(fileName);
    await expect(filePreview.locator("img")).toBeVisible();
    await page.getByTestId("SmartForm.close").click();
    await expect(filterBarFilePicker).toBeVisible();
    await selectAndUpsertFile(
      page,
      () => filterBarFilePicker.click(),
      async () => {
        await expect(filePreview).toContainText(fileName);
        await expect(filePreview.locator("img")).toBeVisible();
      },
    );
    await expect(filterBarFilePicker).toBeVisible(getTimeout(2 * MINUTE));
    await expect(
      filesTableWindow.getByText(fileName, { exact: true }),
    ).toHaveCount(2);

    await insertRow(page, "my_table", { content: USERS.default_user1 });
    await insertRow(page, "orders", { status: "incomplete" });
    await expect(page.getByText("secret")).toHaveCount(0);
  });

  test("Admin user (test_user) can see all data", async ({ page: p }) => {
    const page = p;

    await page.request.post("/auth/logout");
    await login(page, USERS.test_user);
    await openConnection(page, TEST_DB_NAME);

    await setWspColLayout(page);
    await page.waitForTimeout(1e3);

    await closeWorkspaceWindows(page);

    /** Open table using ctrl+P */
    await openTable(page, "my_tabl");
    await openTable(page, "ord");
    await openTable(page, "file");

    await expect(page.getByText("abc", { exact: true })).toHaveCount(2);
    await expect(page.getByText("incomplete")).toHaveCount(2);
    await expect(page.getByText("secret")).toHaveCount(1);
    await expect(page.getByText(fileName)).toHaveCount(2);

    /** Replace an existing file through the row editor. */
    await getTableWindow(page, "files")
      .getByTestId("dashboard.window.viewEditRow")
      .first()
      .click();
    await page
      .getByRole("button", { name: "Remove file", exact: true })
      .click();
    await selectAndUpsertFile(
      page,
      (page) => page.getByTestId("FileBtn").click(),
      async () => {
        await expect(page.locator(".FileInputMedia img")).toBeVisible();
      },
      true,
    );
    await expect(page.locator(".SmartForm")).toHaveCount(
      0,
      TWENTY_SECONDS_OR_MORE,
    );
    await expect(page.getByText(fileName)).toHaveCount(2);

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
  // await openConnection(page, TEST_DB_NAME);
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
    const page = p;

    await login(page, USERS.default_user);

    await openConnection(page, TEST_DB_NAME);
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
    await expect(
      page.getByTestId("Popup.content").locator("img"),
    ).toHaveAttribute("src", /blob:/);
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

    /** Valid loaded img */
    const img = page.getByTestId("Popup.content").locator("img");
    await expect(img).toHaveAttribute("src", /prostgles_storage/);
    await expect(img).toBeVisible();
    await expect(img).toHaveJSProperty("complete", true);
    await expect(img).not.toHaveJSProperty("naturalWidth", 0);

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

  test("API tests", async ({ page: p }) => {
    const page = p;
    await login(page, USERS.test_user);

    await openConnection(page, TEST_DB_NAME);
    await page
      .getByTestId("dashboard.goToConnConfig")
      .click(TWENTY_SECONDS_OR_MORE);
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

  test("Admin can create and drop connections", async ({ page: p }) => {
    const page = p;
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
    await expect(deletedConnection).toHaveCount(0);
  });

  test("Set public user access rules", async ({ page: p }) => {
    const page = p;

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
    const page = p;
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    await openTable(page, "my_tabl");

    /** Ask LLM limit */
    const [response1, response2, response3] = await getLLMResponses(page, [
      "hey",
      "hey",
      "hey",
    ]);
    expect(response1).toMatchObject({ isOk: true });
    expect(response2).toMatchObject({ isOk: true });
    expect(response3).toMatchObject({ isOk: true });
  });

  test("Public user ask llm limit", async ({ page: p }) => {
    const page = p;
    await goTo(page, "localhost:3004/connections");
    await page.reload();
    await page
      .getByTestId("dashboard.menu.tablesSearchList")
      .waitFor({ state: "visible", ...TWENTY_SECONDS_OR_MORE });
    const [response1, response2] = await getLLMResponses(page, ["hey", "hey"]);
    expect(response1).toMatchObject({ isOk: true });
    expect(response2).toMatchObject({ isOk: false });
  });

  test("MCP Servers", async ({ page: p }) => {
    const page = p;
    await login(page, USERS.test_user, "localhost:3004/auth/login");
    await openConnection(page, TEST_DB_NAME);

    await runDbsSql(
      page,
      `
      UPDATE mcp_servers SET enabled = false WHERE name IN ('myServer', 'chrome-devtools-test');
      DELETE FROM mcp_servers WHERE name IN ('myServer', 'chrome-devtools-test');

      DELETE FROM alerts; -- left by mock mcp server oauth flows
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
            "chrome-devtools-test": {
              command: "npx",
              args: ["-y", "chrome-devtools-mcp@latest"],
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

    /* Importing fixed arguments without configurable fields must not create an empty schema. */
    expect(
      await runDbsSql(
        page,
        "DELETE FROM mcp_servers WHERE name = 'chrome-devtools-test' RETURNING config_schema",
        undefined,
        { returnType: "rows" },
      ),
    ).toEqual([{ config_schema: null }]);

    await page
      .getByTestId("SmartCardList")
      .locator(getDataKey("myServer"))
      .getByTitle("Press to enable")
      .click();

    await page.getByLabel("ALLOWED_DIR").fill("/prostgles-mcp-test");
    await page.getByText("Enable", { exact: true }).click();
    await page.waitForTimeout(1e3);
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Popup.close").last().click();
    await page.getByTestId("Alerts").click(TWENTY_SECONDS_OR_MORE);
    await expect(page.getByTestId("Alerts")).toContainText(
      "MCP server disabled due to error",
    );
    await page.getByText("Go to issue").click();
    await page
      .locator(getDataKey("myServer"))
      .getByTestId("SmartCard.viewEditRow")
      .click();
    await page.getByTestId("SmartForm.delete").click();
    await page.getByTestId("SmartForm.delete.confirm").click();
  });

  /** Flaky on github */
  test("Web template build works", async ({ page: p }) => {
    const page = p;
    await login(page, USERS.test_user, "localhost:3004/auth/login");
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
      .click(TWENTY_SECONDS_OR_MORE);
    await expect(createFromTemplateBtn).toBeEnabled(TWENTY_SECONDS_OR_MORE);
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
    const page = p;
    await login(page, USERS.test_user, "localhost:3004/auth/login");
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
    const page = p;
    await goTo(page, "localhost:3005");
    await expect(page.locator("body")).toContainText("Not logged in");
    await expect(page.locator("body")).toContainText("Available tables:");
  });

  test("Web app dev mode works", async ({ page: p }) => {
    const page = p;
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
        devProc.stdout.on("data", (data) => {
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
