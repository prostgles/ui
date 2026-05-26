import type { Page } from "@playwright/test";
import * as fs from "fs";
import { createCoverageMap } from "istanbul-lib-coverage";
import { createContext } from "istanbul-lib-report";
import { createSourceMapStore } from "istanbul-lib-source-maps";
import reports from "istanbul-reports";
import * as path from "path";
import { fileURLToPath } from "url";
import v8toIstanbul from "v8-to-istanbul";

export const v8Dir = path.join(process.cwd(), "coverage");
const outDir = path.join(v8Dir, "reports");

export async function startCoverage(page: Page) {
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
}

export async function stopCoverage(page: Page) {
  const browser = page.context().browser();
  if (browser?.browserType().name() !== "chromium") return;
  const coverage = await page.coverage.stopJSCoverage();
  const map = createCoverageMap({});
  for (const entry of coverage) {
    const { source } = entry;
    if (!source) continue;
    if (entry.url.includes("/node_modules/")) continue;
    const url = entry.url.split("?")[0]; // remove query string
    const filename = url.startsWith("file://") ? fileURLToPath(url) : url;
    const mapUrl = entry.url + ".map";
    const sourceMapRes = await fetch(mapUrl);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const sourceMap =
      !sourceMapRes.ok ? undefined : (
        await sourceMapRes.json().catch((err) => {
          console.warn("Could not fetch source map for", mapUrl, err);
          return null;
        })
      );

    const converter =
      sourceMap ?
        v8toIstanbul(filename, 0, {
          source,
          sourceMap: { sourcemap: sourceMap },
        })
      : v8toIstanbul(filename, 0, { source });
    await converter.load();

    converter.applyCoverage(entry.functions);
    const fileCoverageMap = converter.toIstanbul();
    map.merge(fileCoverageMap);
    fs.mkdirSync(v8Dir, { recursive: true });
    fs.writeFileSync(
      path.join(v8Dir, `${Date.now()}-${Math.random()}.json`),
      JSON.stringify(fileCoverageMap),
    );
  }

  const sourceMapStore = createSourceMapStore();
  const remapped = await sourceMapStore.transformCoverage(map);

  const context = createContext({ dir: outDir, coverageMap: remapped });

  reports.create("html").execute(context);
  reports.create("text").execute(context);
}
