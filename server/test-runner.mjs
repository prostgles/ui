import { glob } from "glob";
import { run } from "node:test";
import { spec } from "node:test/reporters";
import { basename } from "path";
/**
 * This approach is used instead of command line node --test because it doesn't find all the spec files
 * */
const files = await glob("dist/server/**/*.spec.js");
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

runner.on("test:fail", () => {
  ac.abort();
});
runner.compose(spec).pipe(process.stdout);
