import { isPlaywrightTest } from "../../i18n/i18nUtils";
import { elementToSVG } from "./elementToSVG";
import { recordDomChanges } from "./recordDomChanges";
import { wrapAllSVGText } from "./textToSVG";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const domToSVG = async (node: HTMLElement, debug = false) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");

  // Get dimensions and position
  const nodeBBox = node.getBoundingClientRect();

  // Set SVG attributes
  svg.setAttribute("width", nodeBBox.width.toString());
  svg.setAttribute("height", nodeBBox.height.toString());
  svg.setAttribute("viewBox", `0 0 ${nodeBBox.width} ${nodeBBox.height}`);

  // Create defs section for gradients, patterns, etc.
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  svg.appendChild(defs);

  // Process the node and all its children recursively
  const nodeComputedStyle = window.getComputedStyle(node);

  // Add background to root SVG if needed
  if (
    nodeComputedStyle.backgroundColor &&
    nodeComputedStyle.backgroundColor !== "rgba(0, 0, 0, 0)"
  ) {
    const bgRect = document.createElementNS(SVG_NAMESPACE, "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", nodeComputedStyle.backgroundColor);
    svg.appendChild(bgRect);
  }

  const context = {
    offsetX: -nodeBBox.left,
    offsetY: -nodeBBox.top,
    defs: defs,
    idCounter: 0,
    fontFamilies: [],
  };
  await elementToSVG(node, svg, context);
  await wrapAllSVGText(svg);

  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  console.log("SVG created", svgString);
  // recordDomChanges(node);
  return svgString;
};

if (isPlaywrightTest) {
  //@ts-ignore
  window.toSVG = domToSVG;
}

declare global {
  interface Element {
    setAttribute(name: string, value: any): void;
  }
}
