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
              const seen = new WeakSet<object>();
              return JSON.stringify(logs, (_name, value: unknown) => {
                if (typeof value === "function") return "[Function]";
                if (value instanceof Map) return Object.fromEntries(value);
                if (value instanceof Error) {
                  return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack,
                  };
                }
                if (typeof value === "object" && value !== null) {
                  if (seen.has(value)) return "[Circular]";
                  seen.add(value);
                }
                return value;
              });
            }, CLIENT_LOGS_KEY)
            .catch(() => undefined);
          return body ? { url: page.url(), logs: JSON.parse(body) } : undefined;
        }),
    )
  ).filter((result) => result !== undefined);

  if (clientLogs.length) {
    await testInfo.attach("latest-client-logs", {
      body: JSON.stringify(clientLogs, null, 2),
      contentType: "application/json",
    });
  }
});
