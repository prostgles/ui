import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const filePath = join(
  __dirname,
  "../node_modules/app-builder-lib/out/fileMatcher.js",
);
const original = readFileSync(filePath, "utf-8");

const PATCH_COMMENT = "// patched by patch-builder.mjs";
if (original.startsWith(PATCH_COMMENT)) {
  console.log("[patch-builder] already patched, skipping");
  process.exit(0);
}
const patched = original.replace(",cc,d.ts,", ",cc,");
if (patched === original) {
  console.error("[patch-builder] pattern not found");
  process.exit(1);
}

writeFileSync(filePath, `${PATCH_COMMENT}\n${patched}`, "utf-8");
console.log("[patch-builder] removed .d.ts exclusion from app-builder-lib");
