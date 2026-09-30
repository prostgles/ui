import {
  CLIENT_LOGS_KEY,
  PERSISTED_CLIENT_LOGS_KEY,
} from "../../../common/constants";
import { test as base } from "@playwright/test";

export { chromium, expect, type Locator } from "@playwright/test";

export const test = base.extend<{ clientLogs: void }>({
  clientLogs: [
    async ({ page }, use, testInfo) => {
      await use();
      const browser = page.context().browser();
      if (!browser) return;
      if (testInfo.status === testInfo.expectedStatus) return;

      const clientLogs = (
        await Promise.all(
          browser
            .contexts()
            .flatMap((context) => context.pages())
            .map(async (page) => {
              const body = await page
                .evaluate(([key, persistedKey]) => {
                  const logs = (window as unknown as Record<string, unknown>)[
                    key
                  ];
                  const persistedLogs = sessionStorage.getItem(persistedKey);
                  return JSON.stringify(
                    logs ?? (persistedLogs ? JSON.parse(persistedLogs) : logs),
                  );
                }, [CLIENT_LOGS_KEY, PERSISTED_CLIENT_LOGS_KEY] as const)
                .catch(() => undefined);
              return {
                url: page.url(),
                logs:
                  body ? JSON.parse(body) : [{ note: "client logs missing" }],
              };
            }),
        )
      ).filter((result) => result !== undefined);

      await testInfo.attach("latest-client-logs", {
        body: JSON.stringify(clientLogs, null, 2),
        contentType: "application/json",
      });
    },
    { auto: true },
  ],
});
