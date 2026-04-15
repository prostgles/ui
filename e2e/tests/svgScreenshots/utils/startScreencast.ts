import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEMO_DIR } from "testAskLLM/createReceipts";
import type { PageWIds } from "utils/utils";

const DEFAULT_SIZE = { width: 900, height: 900 };

const sanitizeFileName = (value: string) =>
  value.trim().replace(/[^\w.-]+/g, "_");

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

export const startScreencast = async (page: PageWIds, rawName: string) => {
  if (!rawName?.trim()) throw new Error("Name is required for screencast");

  const name = sanitizeFileName(rawName);
  const recordingId = `${name}-${Date.now()}`;
  const framesDir = join(DEMO_DIR, "video-frames", recordingId);
  const outputPath = join(DEMO_DIR, `${name}.webm`);

  await mkdir(framesDir, { recursive: true });
  await mkdir(DEMO_DIR, { recursive: true });

  const browserName = page.context().browser()?.browserType().name();
  if (browserName !== "chromium") {
    throw new Error("CDP screencast requires Chromium");
  }

  const size = page.viewportSize() ?? DEFAULT_SIZE;
  const cdp = await page.context().newCDPSession(page);

  let frameIndex = 0;
  let stopped = false;
  const pendingWrites = new Set<Promise<void>>();

  const onFrame = (evt: {
    data: string; // base64
    sessionId: number;
    metadata: unknown;
  }) => {
    // Ack ASAP to avoid stalling frame delivery
    void cdp.send("Page.screencastFrameAck", { sessionId: evt.sessionId });

    const file = `${String(frameIndex++).padStart(6, "0")}.png`;
    const abs = join(framesDir, file);

    // data is base64 PNG
    const p = writeFile(abs, evt.data, "base64").finally(() => {
      pendingWrites.delete(p);
    });
    pendingWrites.add(p);
  };

  await cdp.send("Page.enable");
  cdp.on("Page.screencastFrame", onFrame);

  await cdp.send("Page.startScreencast", {
    format: "png", // lossless frames
    everyNthFrame: 1,
    maxWidth: size.width,
    maxHeight: size.height,
    quality: 100,
  });

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;

      try {
        await cdp.send("Page.stopScreencast");
        cdp.off("Page.screencastFrame", onFrame);

        // Ensure all frame files are fully flushed before ffmpeg
        await Promise.all([...pendingWrites]);

        // Lossless VP9 encode (large file, sharp text)
        await runFfmpeg([
          "-y",
          "-framerate",
          "30",
          "-start_number",
          "0",
          "-i",
          join(framesDir, "%06d.png"),
          "-an",
          "-c:v",
          "libvpx-vp9",
          // "-lossless",
          // "1",
          "-pix_fmt",
          "yuv420p",
          "-row-mt",
          "1",
          "-threads",
          "4",
          outputPath,
        ]);
      } finally {
        await cdp.detach().catch(() => {});
        await rm(framesDir, { recursive: true, force: true });
      }
    },
  };
};
