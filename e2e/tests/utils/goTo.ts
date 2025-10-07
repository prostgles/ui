import type { Request } from "@playwright/test";
import { type PageWIds } from "./utils";
import { localNoAuthSetup, USERS } from "./constants";

export const goTo = async (page: PageWIds, url = "localhost:3004") => {
  const pendingRequests = new Set<Request>();

  // Store listener references for cleanup
  const requestListener = (request: Request) => {
    pendingRequests.add(request);
    // console.log(`→ REQUEST: ${request.method()} ${request.url()}`);
  };

  const requestFinishedListener = (request: Request) => {
    pendingRequests.delete(request);
    // console.log(`✓ FINISHED: ${request.url()}`);
  };

  const requestFailedListener = (request: Request) => {
    pendingRequests.delete(request);
    // console.log(`✗ FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  };

  // const responseListener = (response: Response) => {
  //   console.log(`← RESPONSE: ${response.status()} ${response.url()}`);
  // };

  page.on("request", requestListener);
  page.on("requestfinished", requestFinishedListener);
  page.on("requestfailed", requestFailedListener);
  // page.on("response", responseListener);
  try {
    const resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30e3,
    });
    if (resp && resp.status() >= 400) {
      console.error(`page.goto failed:`, await resp.text());
    }
    if (!resp) {
      console.warn(`page.goto ${url}: no response`);
    }
  } catch (error) {
    const requestInfo = Array.from(pendingRequests)
      .map((request) => {
        let reqMethod = "??";
        let reqUrl = "??";
        try {
          reqUrl = request.url();
        } catch {}
        try {
          reqMethod = request.method();
        } catch {}
        return `\n - ${reqMethod}: ${reqUrl}`;
      })
      .join("");
    console.error(requestInfo);
    throw new Error("\n⚠️ TIMEOUT! Pending requests: " + requestInfo, {
      cause: error,
    });
    // throw error;
  } finally {
    page.off("request", requestListener);
    page.off("requestfinished", requestFinishedListener);
    page.off("requestfailed", requestFailedListener);
    // page.off("response", responseListener);
  }

  await page.waitForTimeout(500);
  pendingRequests.clear();
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
