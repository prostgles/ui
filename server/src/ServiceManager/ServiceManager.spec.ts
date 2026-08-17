import { strict } from "assert";
import { describe, test } from "node:test";
import { ServiceManager } from "./ServiceManager";

export const IS_GITHUB_WORKER = process.env.CI === "true";

void describe("Service manager tests", async () => {
  await test("Enable speechToText", async () => {
    if (IS_GITHUB_WORKER) {
      return;
    }
    let logText = "";
    const serviceManager = new ServiceManager(undefined);
    const res = await serviceManager.enableService("speechToText", (logs) => {
      const lastLog = logs.at(-1)?.text;
      console.warn(lastLog);
      logText += lastLog;
    });
    strict.equal(res.status, "running");
    strict.equal(
      logText.includes("Running on http://127.0.0.1:8000"),
      true,
      "Service did not start correctly",
    );
    serviceManager.destroy();
  });
});
