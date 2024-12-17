import {
  expect,
  test,
  ElectronApplication,
  _electron as electron,
  Page,
} from "@playwright/test";
let electronApp: ElectronApplication | undefined;

const start = Date.now();
const urlsOpened: string[] = [];
test.beforeAll(async () => {
  process.env.CI = "e2e";
  electronApp = await electron.launch({
    args: [__dirname + "/../build/main.js", "--no-sandbox"],
    env: {
      ...process.env,
      NODE_ENV: "development",
      //'development'
    },
    // tracesDir: './dist',
    // recordVideo: { dir: './dist' }
  });
  electronApp.on("window", async (page) => {
    urlsOpened.push(page.url());
    console.log(`Windows opened: `, urlsOpened);

    page.on("pageerror", (error) => {
      console.error(error);
    });
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
  electronApp
    .process()
    .stdout?.on("data", (data) => console.log(`stdout: ${data}`));
  electronApp
    .process()
    .stderr?.on("data", (error) => console.log(`stderr: ${error}`));
});

test.afterAll(async () => {
  let waitTimeSeconds = 20;
  console.trace("closing app");
  setInterval(() => {
    console.log(
      (Date.now() - start) / 1e3,
      " seconds since started. trying to close... ",
    );
    waitTimeSeconds--;
    if (waitTimeSeconds <= 0) {
      console.trace("Force closing app");
      // process.exit(0);
    }
  }, 1e3);
  await electronApp?.close();
  waitTimeSeconds = 0;
  console.log("afterAll electronApp", !!electronApp);
});

test.setTimeout(2 * 60e3);

test("renders the first page", async () => {
  if (!electronApp) {
    console.error("No electronApp");
    return;
  }

  const page = await electronApp.firstWindow();

  const screenshot = async (name?: string) => {
    if (!page) return;
    await page.screenshot({
      path: `../e2e/electron-report/s-${name ?? new Date().toISOString().replaceAll(":", "")}.png`,
    });
  };

  /** Privacy */
  await page
    .getByTestId("ElectronSetup.Next")
    .waitFor({ state: "visible", timeout: 120e3 });
  await screenshot();
  await page.getByTestId("ElectronSetup.Next").click();

  /** PG Installation info */
  await page
    .getByTestId("PostgresInstallationInstructions")
    .waitFor({ state: "visible", timeout: 120e3 });
  await screenshot();
  await page.getByTestId("PostgresInstallationInstructions").click();
  await page.waitForTimeout(1000);
  await screenshot();
  await page.getByTestId("PostgresInstallationInstructions.Close").click();
  await page.getByTestId("ElectronSetup.Next").click();

  /** State db connection details */
  await page.waitForTimeout(1000);
  await screenshot();
  await page.getByLabel("user").fill("usr");
  await page.getByLabel("password").fill("psw");
  await page.getByLabel("database").fill("prostgles_desktop_db");

  /** Ensure overflow does not obscure done button */
  await page.getByTestId("MoreOptionsToggle").click();
  const doneBtn = await page.getByTestId("ElectronSetup.Done");
  await expect(doneBtn).toBeVisible();
  await screenshot();
  await doneBtn.click();
  await page.waitForTimeout(1000);

  await screenshot();
  // let passed = false;
  // setInterval(() => {
  //   if(passed) return;
  //   screenshot();
  // }, 2e3);
  await page
    .getByTestId("ConnectionServer.add")
    .waitFor({ state: "visible", timeout: 60e3 });
  await screenshot();
  await page.locator("a.LEFT-CONNECTIONINFO").click();
  await screenshot();
  await page
    .getByTestId("dashboard.goToConnConfig")
    .waitFor({ state: "visible", timeout: 2e3 });
  await screenshot();
  // await page.reload();
  await page
    .getByTestId("dashboard.goToConnConfig")
    .waitFor({ state: "visible", timeout: 2e3 });
  await page.getByTestId("dashboard.goToConnections").click();
  await createDatabase("sample_db", page);
  await screenshot();
  await page.waitForTimeout(1000);
  await page
    .getByTestId("dashboard.goToConnConfig")
    .waitFor({ state: "visible", timeout: 10e3 });
  await screenshot();
  await page.waitForTimeout(1000);
  await page.getByTestId("dashboard.goToConnections").click();
  await createDatabase("crypto", page, true);
  await screenshot();
  await page.waitForTimeout(1000);
  await screenshot();
  await page.getByTestId("dashboard.goToConnConfig").click();
  await screenshot();
  await page.getByTestId("config.bkp").click();
  await screenshot();
  await page.getByTestId("config.bkp.create").click();
  await screenshot();
  await page.getByTestId("config.bkp.create.start").click();
  await page.waitForTimeout(3e3);
  await screenshot();
  await page
    .getByTestId("BackupControls.Restore")
    .waitFor({ state: "visible", timeout: 2e3 });
  console.log("electronApp", !!electronApp);
  // await browser.close();
  // await page.close();
  // passed = true;
});

const MINUTE = 60e3;
export const createDatabase = async (
  dbName: string,
  page: Page,
  fromTemplates = false,
  owner?: { name: string; pass: string },
) => {
  await page.locator(`[data-command="ConnectionServer.add"]`).first().click();
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
  // await page.getByTestId("dashboard.menu").waitFor({ state: "visible", timeout: workspaceCreationAndLoatTime });
};
