import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const svgifToWebm = async ({
  svgifPath,
  outDir,
  width = 900,
  height = 900,
  pixelRatio = 2,
}: {
  svgifPath: string;
  outDir: string;
  width?: number;
  height?: number;
  pixelRatio?: number;
}) => {
  const durationMillis = parseFloat(
    fs
      .readFileSync(svgifPath, "utf-8")
      .split(`data-duration="`)[1]
      ?.split(`"`)[0] ?? "",
  );
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
    throw new Error(`Invalid or missing duration in SVGif: ${svgifPath}`);
  }

  const fileNameWithoutExt = path.basename(svgifPath).split(".svgif")[0]!;
  const outputPath = path.join(outDir, fileNameWithoutExt + ".webm");
  fs.mkdirSync(outDir, { recursive: true });

  // Render the SVG at the output resolution; screencasts use CSS pixels.
  const size = { width: width * pixelRatio, height: height * pixelRatio };
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: size });
    // Tracing's lower-resolution capture takes precedence over screencast size.
    await page.context().tracing.stop();
    await page.goto(pathToFileURL(path.resolve(svgifPath)).href, {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((img) => img.decode().catch(() => {})),
      );
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = 0;
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });

    await page.screencast.start({
      path: outputPath,
      size,
      fps: 60,
      quality: 100,
    });
    await page.evaluate(() => {
      const startTime = document.timeline.currentTime;
      for (const animation of document.getAnimations()) {
        animation.play();
        animation.startTime = startTime;
      }
    });
    await page.waitForTimeout(durationMillis);
    await page.screencast.stop();
  } finally {
    await browser.close();
  }

  console.log("Done → " + outputPath);
};
