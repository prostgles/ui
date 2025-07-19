import { drawShapesOnSVG } from "../../dashboard/Charts/drawShapes/drawShapesOnSVG";
import { addOverflowClipPath } from "./addOverflowClipPath";
import { SVG_NAMESPACE } from "./domToSVG";
import { getBBoxCode, type SVGScreenshotNodeType } from "./domToThemeAwareSVG";
import { fontIconToSVG } from "./fontIconToSVG";
import { getWhatToRenderOnSVG } from "./getWhatToRenderOnSVG";
import { addImageFromDataURL, imgToSVG } from "./imgToSVG";
import { isElementNode } from "./isElementVisible";
import { rectangleToSVG } from "./rectangleToSVG";
import { textToSVG } from "./text/textToSVG";

export type SVGContext = {
  offsetX: number;
  offsetY: number;
  defs: SVGDefsElement;
  idCounter: number;
  fontFamilies: string[];
  cssDeclarations: Map<string, string>;
};
export type SVGNodeLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  style: CSSStyleDeclaration;
};

export const elementToSVG = async (
  element: HTMLElement,
  parentSvg: SVGElement | SVGGElement,
  context: SVGContext,
) => {
  const { elemInfo, ...whatToRender } = await getWhatToRenderOnSVG(
    element,
    context,
    parentSvg,
  );
  const { x, y, width, height, style, isVisible } = elemInfo;

  if (!isVisible) {
    return whatToRender;
  }

  const g = document.createElementNS(SVG_NAMESPACE, "g");
  g._domElement = element;

  if (style.opacity !== "1") {
    g.setAttribute("opacity", style.opacity.toString());
  }

  const roundedPosition = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
  const bboxCode = getBBoxCode(element, roundedPosition);
  (g as SVGScreenshotNodeType)._bboxCode = bboxCode;

  Object.entries({
    ...whatToRender.attributeData,
    ...whatToRender.childAffectingStyles,
  }).forEach(([key, value]) => {
    if (value) {
      //@ts-ignore
      g.setAttribute(key, value);
    }
  });
  rectangleToSVG(g, element, style, elemInfo, whatToRender, bboxCode, context);

  if (whatToRender.text?.length) {
    whatToRender.text.forEach((textForSVG) => {
      textToSVG(element, g, textForSVG, style, bboxCode);
    });
  }

  if (element instanceof HTMLCanvasElement) {
    if (element._drawn?.shapes.length) {
      const { shapes, scale, translate } = element._drawn;
      const transformedG = document.createElementNS(SVG_NAMESPACE, "g");
      g.setAttribute("transform", `translate(${x}, ${y})`);
      g.appendChild(transformedG);
      drawShapesOnSVG(shapes, context, transformedG, { scale, translate });
    } else {
      element._deckgl?.redraw("screenshot");
      const dataURL =
        element._deckgl?.getCanvas()?.toDataURL("image/png") ??
        element.toDataURL("image/png");
      addImageFromDataURL(g, dataURL, context, elemInfo);
    }
  }

  if (whatToRender.image?.type === "foreignObject") {
    parentSvg.appendChild(whatToRender.image.foreignObject);

    (whatToRender.image.foreignObject as SVGScreenshotNodeType)._bboxCode =
      bboxCode;
    return;
  }
  if (whatToRender.image?.type === "fontIcon") {
    await fontIconToSVG(g, whatToRender.image, context, elemInfo);
  } else if (whatToRender.image?.type === "img") {
    await imgToSVG(g, whatToRender.image.element, elemInfo, context);
  }

  for (const child of getChildrenSortedByZIndex(element)) {
    if (isElementNode(child)) {
      await elementToSVG(child, g, context);
    }
  }

  if (g.childNodes.length) {
    addOverflowClipPath(
      element,
      style,
      g,
      { x, y, width, height },
      context,
      whatToRender,
    );
    parentSvg.appendChild(g);
  }

  return whatToRender;
};

const getChildrenSortedByZIndex = (element: HTMLElement): HTMLElement[] => {
  const children = Array.from(element.children) as HTMLElement[];
  return children.slice(0).sort((a, b) => {
    const aZIndex = parseInt(getComputedStyle(a).zIndex) || 0;
    const bZIndex = parseInt(getComputedStyle(b).zIndex) || 0;
    return aZIndex - bZIndex;
  });
};

declare global {
  interface SVGGElement {
    _domElement?: HTMLElement;
  }
}
