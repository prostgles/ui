import * as path from "path";
import type { SVGif } from "Testing";

export const DOCS_DIR = path.join(__dirname, "../../../../docs/");
if (!DOCS_DIR.endsWith("ui/docs/")) {
  throw new Error("DOCS_DIR is not set correctly: " + DOCS_DIR);
}

export const SCREENSHOTS_PATH = "/screenshots";
export const SVGIF_SCENES_PATH = "/svgif-scenes";

export const SVG_SCREENSHOT_DIR = path.join(DOCS_DIR, SCREENSHOTS_PATH);
export const SVGIF_SCENES_DIR = path.join(
  DOCS_DIR,
  SCREENSHOTS_PATH,
  SVGIF_SCENES_PATH,
);

export type SVGifScene = SVGif.Scene;
