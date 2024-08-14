import { expect, test } from '@playwright/test';
import { PageWIds, USERS, createDatabase, fillLoginFormAndSubmit, goTo, login } from "./utils";


test.describe("Login rate limit", () => { 

  test("Limit login attempts", async ({ page: p }) => {
    const page = p as PageWIds;

    await goTo(page, "/login");
    const loginAndExpectError = async (errorMessage: string, user: string) => {
      await page.waitForTimeout(1e3);
      await fillLoginFormAndSubmit(page, user);
      await page.getByTestId("Login.error").waitFor({ state: "visible", timeout: 15e3 });
      expect(await page.getByTestId("Login.error").textContent()).toContain(errorMessage);
    }
    for(let i = 0; i < 5; i++){
      await loginAndExpectError("Provided credentials are not correct", "invalid");
    }
    await loginAndExpectError("Too many failed attempts", "invalid");
    await loginAndExpectError("Too many failed attempts", USERS.default_user);
  });
});