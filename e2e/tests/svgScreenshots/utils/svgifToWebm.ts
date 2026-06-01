import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
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
  const fps = 60;
  const durationMillis = parseFloat(
    fs
      .readFileSync(svgifPath, "utf-8")
      .split(`data-duration="`)[1]
      ?.split(`"`)[0] ?? 1,
  );
  if (!durationMillis || isNaN(durationMillis)) {
    throw new Error(`Invalid or missing duration in SVGif: ${svgifPath}`);
  }
  const durationSeconds = Math.ceil(durationMillis / 1000);
  const total = Math.round(fps * durationSeconds);
  const frameDuration = 1000 / fps;

  const fileNameWithoutExt = path.basename(svgifPath).split(".svgif")[0];
  const framesDir = path.join(outDir, fileNameWithoutExt);
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--run-all-compositor-stages-before-draw",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: pixelRatio,
  });

  const page = await context.newPage();
  const url =
    /^https?:\/\//.test(svgifPath) ? svgifPath : (
      `file://${path.resolve(svgifPath)}`
    );

  await page.goto(url, { waitUntil: "networkidle" });

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => img.decode?.().catch(() => {})),
    );
  });

  const cdp = await context.newCDPSession(page);

  await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });

  // Advance virtual time by `budget` ms and wait until all JS callbacks
  // triggered by that advancement have settled before returning.
  const advanceVirtualTime = (budget: number) =>
    new Promise((resolve) => {
      cdp.once("Emulation.virtualTimeBudgetExpired", resolve);
      void cdp.send("Emulation.setVirtualTimePolicy", {
        policy: "pauseIfNetworkFetchesPending",
        budget,
        maxVirtualTimeTaskStarvationCount: 10000,
      });
    });

  // Wait for two rAF ticks: the first lets any pending animation callbacks
  // fire with the updated virtual timestamp; the second ensures the result
  // has been composited and is visible to screenshot().
  const waitForPaint = () =>
    page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
    );

  // CSS/Web Animations run on the compositor's real-time clock, not virtual
  // time. We pause every animation and manually set its currentTime so each
  // frame is positioned exactly where it should be regardless of how long
  // Playwright takes between screenshots.
  const syncAnimations = (t: number) =>
    page.evaluate((time) => {
      for (const anim of document.getAnimations()) {
        anim.pause();
        anim.currentTime = time;
      }
    }, t);

  console.log(
    `Capturing ${total} frames at ${fps}fps (duration: ${durationSeconds}s)…`,
  );
  for (let i = 0; i < total; i++) {
    const t = i * frameDuration;

    await syncAnimations(t);
    await waitForPaint();

    const file = path.join(framesDir, `${String(i).padStart(6, "0")}.png`);
    await page.screenshot({
      path: file,
      type: "png",
      // scale: "css",
      scale: "device",
      animations: "allow",
    });

    if (i < total - 1) {
      await advanceVirtualTime(frameDuration);
    }
  }

  console.log("\nEncoding…");
  await browser.close();

  const outputFileName = fileNameWithoutExt + ".webm";
  try {
    // execSync(
    //   `ffmpeg -y -framerate ${fps} -i "${path.join(framesDir, "%06d.png")}" ` +
    //     `-c:v libvpx-vp9 -b:v 0 -crf 15 -pix_fmt yuv444p -vsync cfr -r ${fps} ${outputFileName} `,
    //   {
    //     cwd: outDir,
    //   },
    // );
    await runFfmpeg(
      [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        path.join(framesDir, "%06d.png"),
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        "10", // "15",
        "-pix_fmt",
        "yuv444p",
        "-vsync",
        "cfr",
        "-r",
        String(fps),
        outputFileName,
      ],
      outDir,
    );
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }

  console.log("Done → " + outputFileName);
};

const runFfmpeg = (args: string[], cwd?: string) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited code=${code} signal=${signal}`));
    });
  });
