import { glob } from "glob";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run } from "node:test";
import { spec } from "node:test/reporters";
import { basename } from "path";

const rootLock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);
const serverLock = JSON.parse(
  readFileSync(new URL("./package-lock.json", import.meta.url), "utf8"),
);
assert.equal(
  rootLock.packages["node_modules/prostgles-types"].version,
  serverLock.packages["node_modules/prostgles-types"].version,
  "Root prostgles-types version must match server/package-lock.json",
);

/**
 * This approach is used instead of command line node --test because it doesn't find all the spec files
 * */
const patterns = process.argv.slice(2);
const files = (await glob("dist/server/**/*.spec.js")).filter(
  (file) =>
    !patterns.length || patterns.some((pattern) => file.includes(pattern)),
);
if (!files.length) throw new Error("No test files matched");
/** Hacky approach for dev to push _ files first */
const hasUnderlineFile = files.find((f) => f.includes("/_"));
const sortedFiles =
  hasUnderlineFile ?
    files.sort((aFull, bFull) => {
      const a = basename(aFull);
      const b = basename(bFull);
      return a.localeCompare(b);
    })
  : files;

// Bail on first failure
const ac = new AbortController();
const runner = run({ files: sortedFiles, signal: ac.signal });

runner.on("test:stdout", ({ message }) => process.stdout.write(message));
runner.on("test:stderr", ({ message }) => process.stderr.write(message));

runner.on("test:fail", () => {
  process.exitCode = 1;
  ac.abort();
});
runner.compose(spec).pipe(process.stdout);
