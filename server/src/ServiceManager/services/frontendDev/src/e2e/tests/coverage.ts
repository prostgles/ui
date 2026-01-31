import type { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import v8toIstanbul from "v8-to-istanbul";
import reports from "istanbul-reports";
import { createCoverageMap } from "istanbul-lib-coverage";
import { createContext } from "istanbul-lib-report";

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
    const converter = v8toIstanbul("", 0, { source });
    await converter.load();
    converter.applyCoverage(entry.functions);
    const convertedCoverage = converter.toIstanbul();
    map.merge(converter.toIstanbul());
    fs.mkdirSync(v8Dir, { recursive: true });
    fs.writeFileSync(
      path.join(v8Dir, `${Date.now()}-${Math.random()}.json`),
      JSON.stringify(convertedCoverage),
    );
  }
  const context = createContext({ dir: outDir, coverageMap: map });
  reports.create("html").execute(context);
  reports.create("text").execute(context);
  await browser.close();
}
