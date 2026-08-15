import type { UseProstglesClientProps } from "prostgles-client";
import { isPlaywrightTest } from "src/i18n/i18nUtils";
import { CLIENT_LOGS_KEY } from "@common/constants";

/** Add logs to window */
const BATCH_SIZE = 100;
export const logClientEvents: UseProstglesClientProps["onDebug"] = (ev) => {
  if (!isPlaywrightTest) {
    return;
  }

  const logs = window[CLIENT_LOGS_KEY] ?? [];
  window[CLIENT_LOGS_KEY] = [...logs.slice(-(BATCH_SIZE - 1)), ev];
};
