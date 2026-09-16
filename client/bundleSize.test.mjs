import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

const MAX_INITIAL_SIZE = 1_450_000;
const MAX_TOTAL_SIZE = 5_000_000;
const BUILD_DIR = path.resolve(import.meta.dirname, "build");
const BUNDLE_EXTENSIONS = new Set([".css", ".js", ".mjs"]);

test("built client bundle stays within its size budgets", async () => {
  const assetPaths = [];
  const pendingDirectories = [BUILD_DIR];

  while (pendingDirectories.length) {
    const directory = pendingDirectories.pop();
    const entries = await readdir(directory, { withFileTypes: true });

    entries.forEach((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pendingDirectories.push(entryPath);
      } else if (BUNDLE_EXTENSIONS.has(path.extname(entry.name))) {
        assetPaths.push(entryPath);
      }
    });
  }

  const indexHtml = await readFile(path.join(BUILD_DIR, "index.html"), "utf8");
  const initialAssetPaths = [...indexHtml.matchAll(/(?:src|href)="\/([^"]+)"/g)]
    .map((match) => path.join(BUILD_DIR, match[1]))
    .filter((assetPath) => assetPaths.includes(assetPath));
  const compressedSizes = await Promise.all(
    assetPaths.map(
      async (assetPath) =>
        gzipSync(await readFile(assetPath), { level: 9 }).byteLength,
    ),
  );
  const initialSize = assetPaths.reduce(
    (total, assetPath, index) =>
      total +
      (initialAssetPaths.includes(assetPath) ? compressedSizes[index] : 0),
    0,
  );
  const totalSize = compressedSizes.reduce((total, size) => total + size, 0);
  const formatSize = (size) => `${(size / 1024 / 1024).toFixed(2)} MiB`;

  assert.ok(
    initialAssetPaths.length,
    "No initial bundle assets found in index.html",
  );
  assert.ok(
    initialSize <= MAX_INITIAL_SIZE,
    `Initial bundle is ${formatSize(initialSize)} gzipped; limit is ${formatSize(MAX_INITIAL_SIZE)}`,
  );
  assert.ok(
    totalSize <= MAX_TOTAL_SIZE,
    `Total bundle is ${formatSize(totalSize)} gzipped; limit is ${formatSize(MAX_TOTAL_SIZE)}`,
  );
});
