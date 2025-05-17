import { isPlaywrightTest } from "../../i18n/i18nUtils";
import { elementToSVG } from "./elementToSVG";
import { recordDomChanges } from "./recordDomChanges";
import { wrapAllSVGText } from "./textToSVG";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const domToSVG = async (node: HTMLElement, debug = false) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  if (debug) {
    svg.style.position = "absolute";
    svg.style.left = `20px`;
    svg.style.top = `520px`;
    svg.style.zIndex = "9999";
    document.body.appendChild(svg);
  }

  // Get dimensions and position
  const rect = node.getBoundingClientRect();

  // Set SVG attributes
  svg.setAttribute("width", rect.width.toString());
  svg.setAttribute("height", rect.height.toString());
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

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
    const background = document.createElementNS(SVG_NAMESPACE, "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", nodeComputedStyle.backgroundColor);
    svg.appendChild(background);
  }

  // Start processing from the node
  const context = {
    offsetX: -rect.left,
    offsetY: -rect.top,
    defs: defs,
    idCounter: 0,
    fontFamilies: [],
  };
  await elementToSVG(node, svg, context);
  wrapAllSVGText(svg);

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
