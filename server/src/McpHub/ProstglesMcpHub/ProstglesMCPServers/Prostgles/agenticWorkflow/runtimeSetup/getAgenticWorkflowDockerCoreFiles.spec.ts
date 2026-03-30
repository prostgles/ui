import { strict } from "assert";
import { test } from "node:test";
import { packageJson } from "./getAgenticWorkflowDockerCoreFiles";
import { getProperty } from "@common/utils";
const serverPackageJsonPath = "../".repeat(9) + "package.json";
// eslint-disable-next-line security/detect-non-literal-require
const serverPackageJson = require(serverPackageJsonPath) as typeof packageJson;
void test("Same package versions are used", () => {
  for (const depProp of ["dependencies", "devDependencies"] as const) {
    for (const [pkg, version] of Object.entries(packageJson[depProp])) {
      const expectedVersion =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        getProperty(serverPackageJson[depProp], pkg) ||
        /** prostgles-types is used from prostgles-server  */
        // eslint-disable-next-line security/detect-non-literal-require
        "^" + require(pkg + "/package.json").version;
      strict.equal(
        version,
        expectedVersion,
        `Version mismatch for package ${pkg}: expected ${expectedVersion}, got ${version}`,
      );
    }
  }
});
