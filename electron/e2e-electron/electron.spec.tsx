import { expect, test, ElectronApplication, 
  _electron as electron, Page 
} from '@playwright/test';
let electronApp: ElectronApplication | undefined;

test.beforeAll(async () => {
  process.env.CI = 'e2e'
  electronApp = await electron.launch({
    args: [
      __dirname + "/../build/main.js",
      "--no-sandbox"
    ],
    env: { ...process.env, NODE_ENV: 'development' },
    recordVideo: { dir: './dist' }
  });
  electronApp.on('window', async (page) => {
    console.log(`Window opened`)

    page.on('pageerror', (error) => {
      console.error(error)
    })
    page.on('console', (msg) => {
      console.log(msg.text())
    })
  })
})

test.afterAll(async () => {
  if(!electronApp) return;
  await electronApp.close()
})

let page: Page | undefined;

test.setTimeout(60e3)
test('renders the first page', async () => {
  if(!electronApp) return;
  page = await electronApp.firstWindow();
  await page.waitForTimeout(12000);
  await page.waitForTimeout(1000);
  await page.waitForTimeout(12000);
  await page.reload();

  /** Privacy */
  await page.getByTestId("ElectronSetup.Next").waitFor({ state: "visible", timeout: 120e3 });
  await page.getByTestId("ElectronSetup.Next").click();

  /** PG Installation info */
  await page.waitForTimeout(1000);
  await page.getByTestId("PostgresInstallationInstructions").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("PostgresInstallationInstructions.Close").click();
  await page.getByTestId("ElectronSetup.Next").click();

  /** State db connection details */
  await page.waitForTimeout(1000);
  await page.getByLabel("password").fill("password");
  /** Ensure overflow does not obscure done button */
  await page.getByTestId("SSLOptionsToggle").click();
  const doneBtn = await page.getByTestId("ElectronSetup.Done");
  await expect(doneBtn).toBeVisible();
  await doneBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "./dist/s1.png" });
  // await page.screenshot({ path: "./dist/s2.png" });
  // await page.waitForSelector('h1')
  // const text = await page.$eval('h1', (el) => el.textContent)
  // expect(text).toBe('Hello World!')
  // const title = await page.title()
  // expect(title).toBe('Window 1')
})

// test(`"create new window" button exists`, async () => {
//   expect(await page.$('#new-window')).toBeTruthy()
// })
