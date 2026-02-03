import type { Request } from "@playwright/test";
import { type PageWIds } from "./utils";
import { localNoAuthSetup, USERS } from "./constants";

export const goTo = async (page: PageWIds, url = "localhost:3004") => {
  const pendingRequests = new Set<Request>();

  // Store listener references for cleanup
  const onRequestStarted = (request: Request) => {
    if (request.url().endsWith(".worker.js")) {
      console.log("Ignoring worker request:", request.url());
      // ignore worker scripts because the request for a worker script stays “pending”
      // for as long as the worker is alive
      return;
    }

    pendingRequests.add(request);
  };

  const onRequestCompleted = (request: Request) => {
    pendingRequests.delete(request);
  };

  const onRequestFailed = (request: Request) => {
    pendingRequests.delete(request);
  };

  page.on("request", onRequestStarted);
  page.on("requestfinished", onRequestCompleted);
  page.on("requestfailed", onRequestFailed);
  // page.on("response", responseListener);
  try {
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
    // Wait until there are no pending requests for at least 500ms
    const start = Date.now();
    while (pendingRequests.size > 0 || Date.now() - start < 500) {
      await page.waitForTimeout(100);
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

    /** It's usually  http://localhost:3004/json.worker.js */
    throw new Error("\n⚠️ TIMEOUT! Pending requests: " + requestInfo, {
      cause: error,
    });
  } finally {
    page.off("request", onRequestStarted);
    page.off("requestfinished", onRequestCompleted);
    page.off("requestfailed", onRequestFailed);
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
