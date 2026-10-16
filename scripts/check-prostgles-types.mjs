import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const getPackageVersion = (lockPath, packageName) => {
  const lock = JSON.parse(
    readFileSync(new URL(lockPath, import.meta.url), "utf8"),
  );
  return lock.packages[`node_modules/${packageName}`].version;
};

const rootVersion = getPackageVersion(
  "../package-lock.json",
  "prostgles-types",
);
for (const project of ["client", "server"]) {
  const projectVersion = getPackageVersion(
    `../${project}/package-lock.json`,
    "prostgles-types",
  );
  assert.equal(
    projectVersion,
    rootVersion,
    `prostgles-types version mismatch: root (${rootVersion}) vs ${project}/package-lock.json (${projectVersion})`,
  );
}

const clientVersion = getPackageVersion(
  "../client/package-lock.json",
  "prostgles-client",
);
const serverVersion = getPackageVersion(
  "../server/package-lock.json",
  "prostgles-client",
);
assert.equal(
  serverVersion,
  clientVersion,
  `prostgles-client version mismatch: client/package-lock.json (${clientVersion}) vs server/package-lock.json (${serverVersion})`,
);
