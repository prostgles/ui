import { getEntries } from "@common/utils";
import { drawShapesOnSVG } from "../../../dashboard/Charts/drawShapes/drawShapesOnSVG";
import { SVG_NAMESPACE } from "../domToSVG";
import { getBBoxCode, type SVGScreenshotNodeType } from "../domToThemeAwareSVG";
import { fontIconToSVG } from "../graphics/fontIconToSVG";
import {
  cloneAnimations,
  copyAnimationStyles,
} from "../graphics/getForeignObject";
import { addImageFromDataURL, imgToSVG } from "../graphics/imgToSVG";
import { textToSVG } from "../text/textToSVG";
import { canvasToDataURL } from "../utils/canvasToDataURL";
import { getWhatToRenderOnSVG } from "../utils/getWhatToRenderOnSVG";
import { isElementNode } from "../utils/isElementVisible";
import { toFixed } from "../utils/toFixed";
import { addOverflowClipPath } from "./addOverflowClipPath";
import { rectangleToSVG } from "./rectangleToSVG";

export type SVGContext = {
  docId: string;
  offsetX: number;
  offsetY: number;
  defs: SVGDefsElement;
  idCounter: number;
  fontFamilies: string[];
  cssDeclarations: Map<string, string>;
  width: number;
  height: number;
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
  const _whatToRender = await getWhatToRenderOnSVG(element, context, parentSvg);

  const { elemInfo, ...whatToRender } = _whatToRender;
  const { x, y, width, height, style, isVisible } = elemInfo;

  if (!isVisible) {
    return whatToRender;
  }

  const g = document.createElementNS(SVG_NAMESPACE, "g");
  g._domElement = element;
  g._whatToRender = _whatToRender;
  g.setAttribute(
    "data-selector",
    [element.nodeName.toLowerCase(), element.className].join("."),
  );

  const roundedPosition = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
  const bboxCode = getBBoxCode(element, roundedPosition);
  (g as SVGScreenshotNodeType)._bboxCode = bboxCode;

  getEntries({
    ...whatToRender.attributeData,
  }).forEach(([key, value]) => {
    if (value) {
      g.setAttribute(key, value);
    }
  });

  getEntries({
    ...whatToRender.childAffectingStyles,
  }).forEach(([key, value]) => {
    if (value && key === "opacity") {
      g.style[key] = value;
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
      const canvas = element._deckgl?.getCanvas() || element;
      const dataURL = canvasToDataURL(canvas);
      addImageFromDataURL(g, dataURL, context, elemInfo);
    }
  }

  if (whatToRender.image?.type === "foreignObject") {
    parentSvg.appendChild(whatToRender.image.foreignObject);

    (whatToRender.image.foreignObject as SVGScreenshotNodeType)._bboxCode =
      bboxCode;
    return;
  }

  const { image } = whatToRender;
  if (image?.type === "svgElement") {
    const width =
      image.element instanceof HTMLImageElement ?
        image.element.width
      : element.clientWidth;
    const height =
      image.element instanceof HTMLImageElement ?
        image.element.height
      : element.clientHeight;
    const gWrapper = document.createElementNS(SVG_NAMESPACE, "g");
    parentSvg.appendChild(gWrapper);
    const svgClone = image.element.cloneNode(true) as SVGElement;
    svgClone.setAttribute("width", `${toFixed(width)}`);
    svgClone.setAttribute("height", `${toFixed(height)}`);
    gWrapper.style.transform = `translate(${toFixed(x)}px, ${toFixed(y)}px)`;
    gWrapper.style.color = style.color;
    gWrapper._gWrapperFor = element;
    gWrapper.appendChild(svgClone);
  } else if (image?.type === "fontIcon") {
    await fontIconToSVG(g, image, context, elemInfo);
  } else if (image?.type === "img") {
    await imgToSVG(g, image.element, elemInfo, context);
  } else if (image?.type === "maskedElement") {
    /** Ensures bbox calculations are stable */
    element.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const { width, height, x, y } = element.getBoundingClientRect();
    const dataUrl = decodeURIComponent(
      style.maskImage.split(",")[1]!.slice(0, -2),
    );
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(dataUrl, "image/svg+xml");
    const svgElement = svgDoc.documentElement;
    svgElement.setAttribute("width", `${toFixed(width)}`);
    svgElement.setAttribute("height", `${toFixed(height)}`);
    svgElement.setAttribute("x", toFixed(x));
    svgElement.setAttribute("y", toFixed(y));
    svgElement.setAttribute("fill", style.color);

    const wrapperG = document.createElementNS(SVG_NAMESPACE, "g");
    wrapperG.appendChild(svgElement);
    /** wrapperG is required to ensure animations work on safari */
    if (style.animation) {
      wrapperG.setAttribute(
        "style",
        `animation: ${style.animation}; transform-origin: ${toFixed(x + width / 2)}px ${toFixed(y + height / 2)}px;`,
      );
    }

    // Extract keyframes from the original element's styles
    copyAnimationStyles(style, wrapperG);
    const animationStyles = cloneAnimations(element);
    if (animationStyles) {
      context.defs.appendChild(animationStyles);
    }

    parentSvg.appendChild(wrapperG);
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
