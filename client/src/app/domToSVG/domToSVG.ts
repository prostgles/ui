import { includes } from "src/dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { addFragmentViewBoxes } from "./addFragmentViewBoxes";
import { elementToSVG, type SVGContext } from "./containers/elementToSVG";
import { renderSvg, wrapAllSVGText } from "./text/textToSVG";
import { tout } from "src/utils";
import { deduplicateSVGPaths } from "./containers/deduplicateSVGPaths";
import type { SVGScreenshotNodeType } from "./domToThemeAwareSVG";

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const domToSVG = async (node: HTMLElement) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  const cssDeclarations = new Map<string, string>();

  // Get dimensions and position
  const nodeBBox = node.getBoundingClientRect();

  svg.setAttribute("width", nodeBBox.width.toString());
  svg.setAttribute("height", nodeBBox.height.toString());
  svg.setAttribute("viewBox", `0 0 ${nodeBBox.width} ${nodeBBox.height}`);

  // Create defs section for gradients, patterns, etc.
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  svg.appendChild(defs);

  const rootId = "id-" + crypto.randomUUID().split("-")[0];
  const context: SVGContext = {
    docId: rootId,
    offsetX: -nodeBBox.left,
    offsetY: -nodeBBox.top,
    width: nodeBBox.width,
    height: nodeBBox.height,
    defs: defs,
    idCounter: 0,
    cssDeclarations,
    fontFamilies: [],
  };
  await elementToSVG(node, svg, context);
  const style = document.createElementNS(SVG_NAMESPACE, "style");
  style.setAttribute("type", "text/css");
  defs.appendChild(style);
  style.textContent = Array.from(cssDeclarations.entries())
    .map(([_selector, declaration]) => declaration)
    .join("\n");

  setBackdropFilters(svg);
  const { remove } = renderSvg(svg);
  await wrapAllSVGText(svg);
  /** Does not really seem effective */
  // deduplicateSVGPaths(svg);
  // await addFragmentViewBoxes(svg, 10);
  repositionAbsoluteAndFixed(svg);
  moveBordersToTop(svg);
  remove();
  await tout(1000);

  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  const [firstG, otherChild] = Array.from(svg.children).filter(
    (c) => c instanceof SVGGElement,
  ) as SVGGElement[];
  if (!firstG) {
    throw new Error("No SVG content generated");
  }
  if (otherChild) {
    throw new Error("Unexpected SVG structure - multiple root elements");
  }
  firstG.setAttribute("id", rootId);
  // recordDomChanges(node);
  return { svgString, svg, rootId };
};

/**
 * Hacky (because bg+border case is not handled) approach to ensure row card foreign key select fields rounded border corners are visible
 */
const moveBordersToTop = (svg: SVGGElement) => {
  svg.querySelectorAll<SVGScreenshotNodeType>("path").forEach((path) => {
    if (
      path._purpose === "border" &&
      path.parentElement instanceof SVGGElement
    ) {
      path.parentElement.appendChild(path);
    }
  });
};

const repositionAbsoluteAndFixed = (svg: SVGGElement) => {
  const [gBody, ...other] = Array.from(
    svg.querySelectorAll<SVGGElement>(":scope > g"),
  );
  if (!gBody || other.length || gBody._domElement !== document.body) {
    console.error("Unexpected SVG structure", { svg, gBody, other });
    throw new Error("Unexpected SVG structure");
  }
  const gElements = Array.from(svg.querySelectorAll("g"));
  gElements.forEach((g) => {
    const style = g._domElement && getComputedStyle(g._domElement);
    if (style?.position === "fixed") {
      gBody.appendChild(g);
    }
    if (style?.position === "absolute") {
      const closestParent = getClosestRelativeOrAbsoluteParent(g) || gBody;
      const closestParentOrGBody =
        gBody.contains(closestParent) ? closestParent : gBody;
      closestParentOrGBody.appendChild(g);
    }
  });
};

const getClosestRelativeOrAbsoluteParent = (g: SVGGElement) => {
  let parentG = g.parentElement;
  while (parentG && parentG instanceof SVGGElement && parentG._domElement) {
    const position = getComputedStyle(parentG._domElement).position;
    if (
      includes(position, ["relative", "absolute"]) &&
      parentG._domElement !== g._domElement
    ) {
      return parentG;
    }
    parentG = parentG.parentElement;
  }
};

declare global {
  interface Element {
    setAttribute(name: string, value: any): void;
  }
}

const setBackdropFilters = (svg: SVGGElement) => {
  const gElements = svg.querySelectorAll("g");
  gElements.forEach((g) => {
    const prevContent = g.parentElement?.parentElement?.previousSibling;
    if (
      g._whatToRender?.backdropFilter &&
      prevContent &&
      prevContent instanceof SVGGElement
    ) {
      prevContent.style.filter = g._whatToRender.backdropFilter;
    }
  });
};
