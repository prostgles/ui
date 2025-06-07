import { drawShapesOnSVG } from "../../dashboard/Charts/drawShapes/drawShapesOnSVG";
import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { isDefined } from "../../utils";
import { addBackground, addBorders } from "./bgAndBorderToSVG";
import { SVG_NAMESPACE } from "./domToSVG";
import { fontIconToSVG } from "./fontIconToSVG";
import { getWhatToRenderOnSVG } from "./getWhatToRenderOnSVG";
import { addImageFromDataURL, imgToSVG } from "./imgToSVG";
import { isElementNode, isElementVisible } from "./isElementVisible";
import { getBoxShadowAsDropShadow } from "./shadowToSVG";
import { textToSVG } from "./textToSVG";

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
  let rectNode: SVGRectElement | undefined;
  const makeRect = () => {
    if (rectNode) return rectNode;
    rectNode = document.createElementNS(SVG_NAMESPACE, "rect");
    rectNode.setAttribute("x", Math.round(x));
    rectNode.setAttribute("y", Math.round(y));
    rectNode.setAttribute("width", Math.round(width).toString());
    rectNode.setAttribute("height", Math.round(height).toString());
    /** This is required to make backgroundSameAsRenderedParent work as expected */
    rectNode.setAttribute("fill", "transparent");

    return rectNode;
  };

  Object.entries(whatToRender.attributeData ?? {}).forEach(([key, value]) => {
    if (value) {
      g.setAttribute(key, value);
    }
  });
  Object.entries(whatToRender.childAffectingStyles ?? {}).forEach(
    ([key, value]) => {
      if (value) {
        //@ts-ignore
        g.setAttribute(key, value);
      }
    },
  );

  if (whatToRender.background) {
    addBackground(makeRect, g, style, element, context);
  }

  const shadow = getBoxShadowAsDropShadow(style);
  if (shadow) {
    makeRect().style.filter = shadow.filter;
  }

  if (whatToRender.border) {
    addBorders(makeRect, g, x, y, width, height, style);
  }

  /** Ensure button edges are crisp */
  if (rectNode) {
    if (rectNode.getAttribute("stroke") !== "rgba(0, 0, 0, 0)") {
      rectNode.setAttribute("x", Math.round(x) + 0.5);
      rectNode.setAttribute("y", Math.round(y) + 0.5);
    } else {
      rectNode.setAttribute("x", Math.round(x));
      rectNode.setAttribute("y", Math.round(y));
    }
  }

  if (whatToRender.text?.length) {
    whatToRender.text.forEach((textInfo) => {
      textToSVG(
        element,
        g,
        textInfo.textContent,
        textInfo.x,
        textInfo.y,
        textInfo.width,
        textInfo.height,
        textInfo.style ?? style,
        context,
      );
    });
  }

  if (
    element.tagName.toLowerCase() === "canvas" &&
    element instanceof HTMLCanvasElement
  ) {
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
    addOverflowClipPath(element, style, g, makeRect(), context);
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

const mustAddClipPath = (element: HTMLElement, style: CSSStyleDeclaration) => {
  if (element instanceof HTMLCanvasElement) return true;
  if (!includes(style.overflow, ["hidden", "auto", "scroll"])) return false;
  const elementIsOverflowing =
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth;
  if (!elementIsOverflowing) return false;
  return Array.from(element.children).some(
    (child) => isElementVisible(child).isVisible,
  );
};

export const addOverflowClipPath = (
  element: HTMLElement,
  style: CSSStyleDeclaration,
  g: SVGGElement,
  clipRect: SVGRectElement,
  context: SVGContext,
) => {
  /**
   * If overflow is set to hidden, we need to add a clip path to the group
   */
  if (!mustAddClipPath(element, style)) return;
  const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
  const clipPathId = `clip-${context.idCounter++}`;
  clipPath.setAttribute("id", clipPathId);
  const transform = g.getAttribute("transform");
  const transformParts = transform?.split(")");
  const translate = transformParts
    ?.map((part) => {
      if (!part.startsWith("translate")) return;
      const [xStr, yStr] = part.split(",");
      if (!xStr || !yStr) return;
      const x = parseFloat(xStr.split("(")[1]!);
      const y = parseFloat(yStr.trim());
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      return [x, y] as [number, number];
    })
    .find(isDefined);
  if (translate) {
    const [x, y] = translate;
    clipRect.setAttribute("transform", `translate(${-x}, ${-y})`);
  }
  clipPath.appendChild(clipRect);
  g.appendChild(clipPath);
  g.setAttribute("clip-path", `url(#${clipPathId})`);
};

declare global {
  interface SVGGElement {
    _domElement?: HTMLElement;
  }
}
