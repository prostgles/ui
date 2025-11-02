import { isDefined } from "../../../utils";
import {
  getBackdropFilter,
  getBackgroundColor,
} from "../containers/bgAndBorderToSVG";
import type { SVGContext } from "../containers/elementToSVG";
import { getFontIconElement } from "../graphics/fontIconToSVG";
import { getTextForSVG } from "../text/getTextForSVG";
import { isElementVisible, isImgNode, isSVGNode } from "./isElementVisible";
import { getForeignObject } from "../graphics/getForeignObject";
import { includes } from "src/dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";

const attributesToKeep = ["data-command", "data-key", "data-label"] as const;
export type WhatToRenderOnSVG = Awaited<
  ReturnType<typeof getWhatToRenderOnSVG>
>;
export const getWhatToRenderOnSVG = async (
  element: HTMLElement,
  context: SVGContext,
  parentSvg: SVGElement | SVGGElement,
) => {
  const { isVisible, style, bbox } = isElementVisible(element);
  // Calculate absolute position
  const x = bbox.left + context.offsetX;
  const y = bbox.top + context.offsetY;
  const width = bbox.width;
  const height = bbox.height;
  const elemInfo = {
    x,
    y,
    width,
    height,
    style,
    bbox,
    isVisible,
  };
  if (!isVisible) return { elemInfo };

  /** Used to highlight so will render as a rectangle */
  const attributeData = attributesToKeep.reduce(
    (acc, attr) => {
      const attrValue = element.getAttribute(attr);
      if (attrValue) {
        return { ...acc, [attr]: attrValue };
      }
      return acc;
    },
    {} as Partial<Record<(typeof attributesToKeep)[number], string>>,
  );

  const background = getBackgroundColor(style);
  const parentBackground =
    background &&
    element.parentElement &&
    getBackgroundColor(getComputedStyle(element.parentElement));
  /**
   * Used to prevent drawing over rounded input border corners
   */
  const backgroundSameAsRenderedParent =
    background &&
    background === parentBackground &&
    (parentSvg as SVGGElement)._domElement === element.parentElement;

  const backdropFilter = getBackdropFilter(style);
  const childAffectingStyles: Partial<
    Pick<CSSStyleDeclaration, "opacity" | "position">
  > = {};
  if (style.opacity && style.opacity !== "1") {
    childAffectingStyles.opacity = style.opacity;
  }
  if (includes(style.position, ["fixed", "absolute", "relative"])) {
    childAffectingStyles.position = style.position;
  }

  const foreignObject = await getForeignObject(element, style, bbox, x, y);
  const fontIcon = getFontIconElement(element);
  const image =
    isSVGNode(element) ?
      {
        type: "svgElement" as const,
        element,
      }
    : foreignObject ?
      {
        type: "foreignObject" as const,
        foreignObject,
      }
    : fontIcon ?
      {
        type: "fontIcon" as const,
        ...fontIcon,
      }
    : isImgNode(element) ?
      {
        type: "img" as const,
        element,
      }
    : style.maskImage.startsWith("url(") ?
      {
        type: "maskedElement" as const,
        element,
      }
    : undefined;

  const text = getTextForSVG(element, style, {
    x,
    y,
    width,
    height,
  });

  return {
    elemInfo,
    attributeData,
    background:
      /** TODO: addNewChildren should be fixed. This is a workaround when non transparent bg appears after dark theme switch */
      element instanceof HTMLBodyElement ? style.background
      : backgroundSameAsRenderedParent || image?.type === "maskedElement" ?
        undefined
      : background,
    backdropFilter,
    border: getBorderForSVG(style),
    childAffectingStyles,
    image,
    text,
  };
};

const getBorderForSVG = (style: CSSStyleDeclaration) => {
  const getBorderDetails = (value: string) => {
    const [width, display, ...colorParts] = value
      .split(" ")
      .map((v) => v.trim());
    const color = colorParts.join(" ");
    if (display !== "none" && width) {
      const widthNum = parseFloat(width);
      if (widthNum && color) {
        return {
          borderWidth: widthNum,
          borderColor: color,
        };
      }
    }
  };

  const border = getBorderDetails(style.border);
  const outline = getBorderDetails(
    [style.outlineWidth, style.outlineStyle, style.outlineColor].join(" "),
  );

  if (border) {
    return {
      type: "border" as const,
      outline,
      ...border,
    };
  }

  const borders = [
    style.borderTop,
    style.borderRight,
    style.borderBottom,
    style.borderLeft,
  ]
    .map(getBorderDetails)
    .filter(isDefined);

  if (borders.length) {
    return {
      type: "borders" as const,
      outline,
      borders,
    };
  }

  if (!outline) return;

  return {
    type: "noBorder" as const,
    outline,
  };
};
