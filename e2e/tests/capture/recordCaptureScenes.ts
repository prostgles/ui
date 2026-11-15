import type { Browser, Frame } from "@playwright/test";
import type { CaptureScene } from "./getCaptureSceneUtils";
import { startCaptureTraceServer } from "./startCaptureTraceServer";

export const recordCaptureScenes = async ({
  browser,
  tracePath,
  videoPath,
  renderDirectory,
  scenes,
  viewport,
}: {
  browser: Browser;
  tracePath: string;
  videoPath: string;
  renderDirectory: string;
  scenes: CaptureScene[];
  viewport: { width: number; height: number };
}) => {
  const context = await browser.newContext({ viewport });
  try {
    const server = await startCaptureTraceServer(
      tracePath,
      scenes,
      renderDirectory,
    );
    try {
      const page = await context.newPage();
      /* The bootstrap installs Playwright's recorded-resource service worker. */
      await page.goto(server.origin);
      await page.waitForURL("**/snapshot/**");
      await page.setContent(`<style>
      body { margin: 0; overflow: hidden; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; visibility: hidden; }
    </style>`);

      const frames: Frame[] = [];
      for (const [index, scene] of server.scenes.entries()) {
        const frameName = `capture-${index}`;
        const snapshotUrl = `${server.origin}/snapshot/${encodeURIComponent(scene.callId)}?phase=after`;
        const [frame] = await Promise.all([
          page.waitForEvent("framenavigated", {
            predicate: (frame) => frame.url() === snapshotUrl,
          }),
          page.evaluate(
            ({ frameName, snapshotUrl }) => {
              const iframe = document.createElement("iframe");
              iframe.name = frameName;
              iframe.src = snapshotUrl;
              document.body.appendChild(iframe);
            },
            { frameName, snapshotUrl },
          ),
        ]);
        await frame.waitForLoadState("load");
        await frame.evaluate(async ({ selector, animation, name }) => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
          for (const existingAnimation of document.getAnimations()) {
            existingAnimation.pause();
            const endTime =
              existingAnimation.effect?.getComputedTiming().endTime;
            if (endTime && Number.isFinite(endTime))
              existingAnimation.currentTime = endTime;
          }
          const element = document.querySelector(selector);
          if (!element)
            throw new Error(`Missing animation target ${selector} in ${name}`);
          const effect = element.animate(animation.keyframes, {
            duration: animation.duration,
            easing: "ease-in-out",
            fill: "both",
          });
          effect.id = "capture-animation";
          effect.pause();
          effect.currentTime = 0;
        }, scene);
        frames.push(frame);
      }

      await page.evaluate(async () => {
        const firstFrame = document.querySelector("iframe");
        if (!firstFrame) throw new Error("No capture frames to record");
        firstFrame.style.visibility = "visible";
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      await page.screencast.start({
        path: videoPath,
        size: viewport,
        fps: 60,
        quality: 100,
      });
      for (const [index, frame] of frames.entries()) {
        await page.evaluate((activeIndex) => {
          document.querySelectorAll("iframe").forEach((iframe, frameIndex) => {
            iframe.style.visibility =
              frameIndex === activeIndex ? "visible" : "hidden";
          });
        }, index);
        await frame.evaluate(async () => {
          const animation = document
            .getAnimations()
            .find((effect) => effect.id === "capture-animation");
          if (!animation) throw new Error("Capture animation is missing");
          animation.play();
          await animation.finished;
        });
      }
      await page.screencast.stop();
    } finally {
      await server.stop();
    }
  } finally {
    await context.close();
  }
};
