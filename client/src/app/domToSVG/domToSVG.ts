import { includes } from "src/dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { tout } from "src/utils/utils";
import { elementToSVG, type SVGContext } from "./containers/elementToSVG";
import type { SVGScreenshotNodeType } from "./domToThemeAwareSVG";
import { renderSvg, wrapAllSVGText } from "./text/textToSVG";
import { BORDER_ELEMENT_TYPES } from "./containers/rectangleToSVG";

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
  wrapAllSVGText(svg);
  /** Does not really seem effective */
  // deduplicateSVGPaths(svg);
  // await addFragmentViewBoxes(svg, 10);
  repositionAbsoluteFixedAndSticky(svg);
  moveBordersToTop(svg);
  removeOverflowedElements(svg);
  repositionMasks(svg);
  remove();
  await tout(100);

  const xmlSerializer = new XMLSerializer();
  const svgString = xmlSerializer.serializeToString(svg);
  const [firstG, otherChild] = Array.from(svg.children).filter(
    (c) => c instanceof SVGGElement,
  );
  if (!firstG) {
    throw new Error("No SVG content generated");
  }
  if (otherChild) {
    throw new Error("Unexpected SVG structure - multiple root elements");
  }
  firstG.setAttribute("id", rootId);
  return { svgString, svg, rootId };
};

/**
 * In divs the mask positioning is relative to the div, but in SVG it's relative to the SVG canvas
 */
const repositionMasks = (svg: SVGGElement) => {
  const gElements = svg.querySelectorAll("g");
  gElements.forEach((g) => {
    const { elemInfo } = g._whatToRender ?? {};
    const maskImage = g.style.maskImage;
    if (maskImage && elemInfo) {
      const { x, y, width, height } = elemInfo;
      const gBBox = g.getBoundingClientRect();
      const offsetX = x - gBBox.left;
      const offsetY = y - gBBox.top;
      g.style.maskSize = `${width}px ${height}px`;
      g.style.maskPosition = `${offsetX}px ${offsetY}px`;
    }
  });
};

const removeOverflowedElements = (svg: SVGGElement) => {
  svg.querySelectorAll("g").forEach((g) => {
    if (g._overflowClipPath) {
      const { x, y, width, height } = g._overflowClipPath;
      const clipXMin = x;
      const clipYMin = y;
      const clipXMax = x + width;
      const clipYMax = y + height;
      if (g.querySelector(`[style*=animation]`)) {
        return;
      }
      g.childNodes.forEach((child) => {
        /** Ignore animated elements */
        if (child instanceof SVGGElement || child instanceof SVGTextElement) {
          const elBBox = child.getBoundingClientRect();
          const cXMin = elBBox.x;
          const cYMin = elBBox.y;
          const cXMax = elBBox.x + elBBox.width;
          const cYMax = elBBox.y + elBBox.height;
          const bboxesOverlap =
            clipXMin < cXMax &&
            clipXMax > cXMin &&
            clipYMin < cYMax &&
            clipYMax > cYMin;
          if (!bboxesOverlap) {
            child.remove();
          }
        }
      });
    }
  });
};

/**
 * Hacky (because bg+border case is not handled) approach to ensure row card foreign key select fields rounded border corners are visible
 */
const moveBordersToTop = (svg: SVGGElement) => {
  svg
    .querySelectorAll<SVGScreenshotNodeType>(BORDER_ELEMENT_TYPES.join(","))
    .forEach((path) => {
      if (
        path._purpose?.border &&
        !path._purpose.background &&
        path.parentElement instanceof SVGGElement
      ) {
        path.parentElement.appendChild(path);
      }
    });
};

const repositionAbsoluteFixedAndSticky = (svg: SVGGElement) => {
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

    /** Move sticky to end */
    if (
      style?.position === "sticky" &&
      g.parentElement instanceof SVGGElement
    ) {
      g.parentElement.appendChild(g);
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
      prevContent instanceof SVGGElement &&
      prevContent._whatToRender?.elemInfo
    ) {
      const { width, height } = g._whatToRender.elemInfo;
      const pBBox = prevContent._whatToRender.elemInfo;
      // If not fully covering it then ignore it
      if (width > pBBox.width * 0.8 && height > 0.8 * pBBox.height) {
        prevContent.style.filter = g._whatToRender.backdropFilter;
      }
    }
  });
};
