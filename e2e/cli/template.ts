export const getE2ETemplate = (configId: string) => ({
  "playwright.config.ts": `
    import { defineE2EConfig } from "@prostgles/app/testing/ui";
    export default defineE2EConfig();`,
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["**/*.ts"],
    },
    null,
    2,
  ),
  ".gitignore": "test-results/\nplaywright-report/\n",
  "AGENTS.md": `
    # UI workflow tests

    - Put business workflows in tests/<role>/*.spec.ts. Import test and expect from ../fixtures and UI helpers from @prostgles/app/testing/ui.
    - Configure seeded users and deterministic data in tests/fixtures.ts using deploymentOptions.users and deploymentOptions.seed. Each test gets a fresh app and database; Docker must be available.
    - Select a seeded user with test.use({ userKey: "member" }). Configure actual app permissions in src/; a user key is only a fixture name, not an authorization role.
    - Start with await app.open(). Reuse openTable(app.page, tableName, true), getTableWindow(app.page, tableName), insertRow(app.page, tableName, values), fillSmartForm, fillSmartFormAndInsert, clickInsertRow and setOrAddWorkspace before adding selectors. These are the same helpers used by Prostgles UI's e2e tests.
    - Assert visible business outcomes and denied actions for each role. Use deployment.connectProjectAs(userKey) when a database assertion helps. Keep app-specific helper functions here beside the workflows.
    - Run npm run test:e2e:install once to install Chromium, then npm run test:e2e. To run a role or workflow: npm run test:e2e -- tests/admin or npm run test:e2e -- -g "workflow name".
    - Videos and traces for every test, including passing tests, are saved in e2e/test-results/. Deployment and PostgreSQL logs are saved alongside them. Artifacts may contain test data and sessions; do not commit them.
    - Run npm run test:e2e:report and select a test to play its video or inspect its trace. The HTML report is in e2e/playwright-report/. Results are replaced on the next run; copy them elsewhere inside the project if they must be kept.
  `,
  tests: {
    "fixtures.ts": `
      import { test as base } from "@prostgles/app/testing/ui";
      export { expect } from "@prostgles/app/testing/ui";
      export const test = base.extend({
        deploymentOptions: {
          configId: ${JSON.stringify(configId)},
          users: [{ key: "admin", type: "admin" }, { key: "member", type: "default" }],
          // seed: async ({ projectDatabase, stateDatabase }) => { ... },
        },
      });`,
    admin: {
      "dashboard.spec.ts": `
        import { test, expect } from "../fixtures";
        test.use({ userKey: "admin" });
        test("admin opens the configured app", async ({ app }) => {
          await app.open();
          await expect(app.page.getByTestId("dashboard.menu")).toBeVisible();
          // Add business workflows using openTable, insertRow and getTableWindow.
        });`,
    },
  },
});
