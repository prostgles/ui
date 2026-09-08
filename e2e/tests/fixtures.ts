import { CLIENT_LOGS_KEY } from "../../common/constants";
import { test as base } from "@playwright/test";

export { chromium, expect, type Locator } from "@playwright/test";

export const test = base;

test.afterEach(async ({ browser }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;

  const clientLogs = (
    await Promise.all(
      browser
        .contexts()
        .flatMap((context) => context.pages())
        .map(async (page) => {
          const body = await page
            .evaluate((key) => {
              const logs = (window as unknown as Record<string, unknown>)[key];
              return JSON.stringify(logs);
            }, CLIENT_LOGS_KEY)
            .catch(() => undefined);
          return {
            url: page.url(),
            logs: body ? JSON.parse(body) : [{ note: "client logs missing" }],
          };
        }),
    )
  ).filter((result) => result !== undefined);

  await testInfo.attach("latest-client-logs", {
    body: JSON.stringify(clientLogs, null, 2),
    contentType: "application/json",
  });
});
