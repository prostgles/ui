import { type PageWIds } from "./utils";
import { localNoAuthSetup, USERS } from "./constants";

export const goTo = async (page: PageWIds, url = "localhost:3004") => {
  const resp = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30e3,
  });
  if (resp && resp.status() >= 400) {
    console.error(`page.goto failed:`, await resp.text());
  }
  if (!resp) {
    console.warn(`page.goto ${url}: no response`);
  }

  await page.waitForTimeout(500);
  const errorCompSelector = "div.ErrorComponent";
  if (await page.isVisible(errorCompSelector)) {
    const pageText = await page.innerText(errorCompSelector);
    if (pageText.includes("connectionError")) {
      if (localNoAuthSetup && pageText.includes("passwordless admin")) {
        throw `For local testing you must disable passwordless admin and \ncreate a prostgles admin account for user: ${USERS.test_user} with password: ${USERS.test_user}`;
      }
      throw pageText;
    }
  }
};
