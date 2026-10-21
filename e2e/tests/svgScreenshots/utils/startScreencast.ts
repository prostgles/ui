import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DEMO_DIR } from "testAskLLM/createReceipts";
import type { PageWIds } from "utils/utils";

// Use a page with automatic video and trace screenshots disabled.
export const startScreencast = async (page: PageWIds, rawName: string) => {
  if (!rawName.trim()) throw new Error("Name is required for screencast");

  const name = rawName.trim().replace(/[^\w.-]+/g, "_");
  await mkdir(DEMO_DIR, { recursive: true });
  await page.screencast.start({
    path: join(DEMO_DIR, `${name}.webm`),
    size: page.viewportSize() ?? { width: 900, height: 900 },
    fps: 60,
    quality: 100,
  });

  return { stop: () => page.screencast.stop() };
};
