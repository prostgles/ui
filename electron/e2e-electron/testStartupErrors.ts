import { expect, type ElectronApplication, type Page } from "@playwright/test";
import { rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/* Startup errors show saved connection details only when editing is requested. */
export const testStartupErrors = async (
  page: Page,
  electronApp: ElectronApplication,
  userDataDir: string,
) => {
  const runtimePath = resolve(
    __dirname,
    "../ui/server/dist/server/src/init/tryStartProstgles.js",
  );
  const credentialsPath = join(userDataDir, ".prostgles-desktop-config.json");
  const savedCredentials = {
    type: "Standard",
    db_conn:
      "postgres://saved_user:saved_password@localhost:5440/saved_database?sslmode=require",
    db_host: "localhost",
    db_port: 5440,
    db_user: "saved_user",
    db_name: "saved_database",
    db_pass: "saved_password",
    db_ssl: "require",
  };
  await page.getByTestId("ElectronSetup.Next").waitFor();
  try {
    const encryptedCredentials = await electronApp.evaluate(
      ({ safeStorage }, credentials) =>
        safeStorage
          .encryptString(JSON.stringify(credentials))
          .toString("base64"),
      savedCredentials,
    );
    writeFileSync(credentialsPath, Buffer.from(encryptedCredentials, "base64"));
    for (const errorType of ["init", "connection"] as const) {
      const message = `Test ${errorType} startup failure`;
      await electronApp.evaluate(
        (_, { runtimePath, errorType, message }) => {
          const { startupState } = require(runtimePath) as StartupRuntime;
          startupState.state = {
            state: "error",
            errorType,
            error: new Error(message),
          };
        },
        { runtimePath, errorType, message },
      );
      await page.reload();
      await expect(page.getByTestId("ErrorComponent")).toContainText(message);
      await expect(page.getByTestId("ElectronSetup.Done")).toBeHidden();
      await expect(
        page.getByTestId("PostgresInstallationInstructions"),
      ).toBeHidden();
      await page
        .getByRole("button", { name: "Edit connection details" })
        .click();
      await expect(page.getByTestId("ElectronSetup.Done")).toBeVisible();
      await expect(page.getByLabel("Host", { exact: true })).toHaveValue(
        savedCredentials.db_host,
      );
      await expect(page.getByLabel("Port", { exact: true })).toHaveValue(
        String(savedCredentials.db_port),
      );
      await expect(page.getByLabel("User", { exact: true })).toHaveValue(
        savedCredentials.db_user,
      );
      await expect(page.getByLabel("Database", { exact: true })).toHaveValue(
        savedCredentials.db_name,
      );
      const passwordInput = page.getByLabel("Password", { exact: true });
      await expect(passwordInput).toHaveValue(savedCredentials.db_pass);
      await expect(passwordInput).toHaveAttribute("type", "password");
      await page.getByTestId("NewConnectionForm.MoreOptionsToggle").click();
      await expect(page.getByTestId("NewConnectionForm.sslMode")).toContainText(
        "require",
      );
      await page.getByTestId("ElectronSetup.Back").click();
      await expect(page.getByTestId("ErrorComponent")).toContainText(message);
      await expect(page.getByTestId("ElectronSetup.Done")).toBeHidden();
    }

    writeFileSync(credentialsPath, "Unreadable saved credentials");
    await page.reload();
    await expect(page.getByTestId("ErrorComponent")).toContainText(
      "Could not read or decrypt the saved state database credentials.",
    );
    await expect(page.getByTestId("ElectronSetup.Done")).toBeHidden();
    await page.getByRole("button", { name: "Edit connection details" }).click();
    await expect(page.getByTestId("ElectronSetup.Done")).toBeVisible();
  } finally {
    rmSync(credentialsPath, { force: true });
    await electronApp.evaluate((_, runtimePath) => {
      const { startupState } = require(runtimePath) as StartupRuntime;
      startupState.state = { state: "loading" };
    }, runtimePath);
    await page.reload();
  }
};

type StartupRuntime = {
  startupState: {
    state:
      | { state: "loading" }
      | {
          state: "error";
          errorType: "init" | "connection";
          error: Error;
        };
  };
};
