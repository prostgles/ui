import { readFileSync } from "fs";
import { test } from "node:test";
import { join } from "path";

void test("Ensure ts versions match to reduce bundle size", () => {
  const prostglesServerPkg = JSON.parse(
    readFileSync(
      join(__dirname, "../../../../node_modules/prostgles-server/package.json"),
      "utf-8",
    ),
  ) as { dependencies: Record<string, string> } | null;

  const prostglesServerTsVersion = prostglesServerPkg?.dependencies.typescript;

  if (prostglesServerPkg && !prostglesServerTsVersion) {
    return;
  }

  const uiTsVersion = JSON.parse(
    readFileSync(join(__dirname, "../../../../package.json"), "utf-8"),
  ).dependencies.typescript;
  if (!prostglesServerTsVersion || prostglesServerTsVersion !== uiTsVersion) {
    throw new Error(
      `TypeScript version mismatch: prostgles-server (${prostglesServerTsVersion}) vs ui (${uiTsVersion})`,
    );
  }
});
