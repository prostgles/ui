import assert from "node:assert/strict";
import { test } from "node:test";

void test("getCorsOptions allows any origin when configured with a wildcard", async () => {
  if (!require.main) throw new Error("Test entry point not found");
  const testEntryPoint = require.main.filename;
  const getCorsOptionsPath = require.resolve("./getCorsOptions");
  const getCorsOptions = (() => {
    try {
      require.main.filename = require.resolve("../index");
      return (
        // eslint-disable-next-line security/detect-non-literal-require
        require(getCorsOptionsPath) as typeof import("./getCorsOptions")
      ).getCorsOptions;
    } finally {
      require.main.filename = testEntryPoint;
    }
  })();

  const options = getCorsOptions(
    {
      cors: { allowedOrigins: ["*"] },
      cors_csp_devmode_enabled: false,
    },
    { is_state_db: false, port: 3005 },
    3004,
  );

  assert.equal(typeof options.origin, "function");
  await new Promise<void>((resolve, reject) => {
    if (typeof options.origin !== "function") {
      reject(new Error("Expected a CORS origin callback"));
      return;
    }
    options.origin("https://example.com", (error, allowed) => {
      if (error) {
        reject(error);
        return;
      }
      assert.equal(allowed, true);
      resolve();
    });
  });
});
