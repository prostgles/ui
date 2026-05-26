import { strict } from "assert";
import { test, describe } from "node:test";
import { getServiceManager } from "./ServiceManager";

void describe("Service manager tests", async () => {
  await test("Enable speechToText", async () => {
    let logText = "";
    const serviceManager = getServiceManager(undefined);
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
