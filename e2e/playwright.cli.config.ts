import { defineConfig, devices } from "@playwright/test";
import config from "./playwright.config";

const packagingTests = ["**/cli_compose.spec.ts", "**/config_deploy.spec.ts"];

export default defineConfig({
  ...config,
  testDir: "./tests/cli",
  workers: 2,
  use: { ...config.use, ...devices["Desktop Chrome"] },
  projects: [
    {
      name: "cli",
      testIgnore: packagingTests,
      /* Reusing a database pair requires sequential deployments. */
      workers:
        process.env.PROSTGLES_E2E_DB_NAMES_PREFIX?.trim() ? 1 : undefined,
    },
    {
      name: "cli-packaging",
      testMatch: packagingTests,
      /* Package preparation replaces assets used by other deployments. */
      dependencies: ["cli"],
      workers: 1,
    },
  ],
});
