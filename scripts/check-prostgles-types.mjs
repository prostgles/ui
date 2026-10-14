import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const getTypesVersion = (lockPath) => {
  const lock = JSON.parse(
    readFileSync(new URL(lockPath, import.meta.url), "utf8"),
  );
  return lock.packages["node_modules/prostgles-types"].version;
};

const rootVersion = getTypesVersion("../package-lock.json");
for (const project of ["client", "server"]) {
  const projectVersion = getTypesVersion(`../${project}/package-lock.json`);
  assert.equal(
    projectVersion,
    rootVersion,
    `prostgles-types version mismatch: root (${rootVersion}) vs ${project}/package-lock.json (${projectVersion})`,
  );
}
