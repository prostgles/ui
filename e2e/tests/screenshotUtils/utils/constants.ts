import * as path from "path";

export const DOCS_DIR = path.join(__dirname, "../../../../docs/");
if (!DOCS_DIR.endsWith("ui/docs/")) {
  throw new Error("DOCS_DIR is not set correctly: " + DOCS_DIR);
}

export const SCREENSHOTS_PATH = "/screenshots";

export const SVG_SCREENSHOT_DIR = path.join(DOCS_DIR, SCREENSHOTS_PATH);

export type SVGifScene = {
  svgFileName: string;
  animations: (
    | {
        type: "click" | "hover";
        elementSelector: string;
        duration: number;
        waitBeforeClick?: number;
        lingerMs?: number;
      }
    | {
        type: "wait";
        duration: number;
      }
  )[];
};
