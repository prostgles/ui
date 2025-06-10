import { isDefined } from "../../utils";
import {
  isElementVisible,
  isImgNode,
  isInputNode,
  isTextNode,
} from "./isElementVisible";
import { getBackgroundColor, hasBorder } from "./bgAndBorderToSVG";
import { getFontIconElement } from "./fontIconToSVG";
import { getForeignObject } from "./svgToSVG";
import type { SVGContext } from "./elementToSVG";

const attributesToKeep = ["data-command", "data-key", "data-label"] as const;

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

  // Use the most prominent border properties
  const borderWidth = Math.max(
    parseFloat(style.borderTopWidth) || 0,
    parseFloat(style.borderRightWidth) || 0,
    parseFloat(style.borderBottomWidth) || 0,
    parseFloat(style.borderLeftWidth) || 0,
  );
  // Use the most prominent color or first available
  let borderColor = style.borderTopColor;
  if (style.borderTopWidth === "0px") {
    if (style.borderRightWidth !== "0px") borderColor = style.borderRightColor;
    else if (style.borderBottomWidth !== "0px")
      borderColor = style.borderBottomColor;
    else if (style.borderLeftWidth !== "0px")
      borderColor = style.borderLeftColor;
  }

  const border =
    borderWidth ?
      {
        borderWidth,
        borderColor,
      }
    : undefined;
  const childAffectingStyles: Partial<CSSStyleDeclaration> = {};
  if (style.opacity !== "1") {
    childAffectingStyles.opacity = style.opacity;
  }

  const foreignObject = await getForeignObject(element, style, bbox, x, y);
  const fontIcon = getFontIconElement(element);
  const image =
    foreignObject ?
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
    : undefined;

  return {
    elemInfo,
    attributeData,
    background: backgroundSameAsRenderedParent ? undefined : background,
    border,
    childAffectingStyles,
    image,
    text: (() => {
      if (isTextNode(element)) {
        throw new Error("Not expecting this to be honest");
      }
      if (isInputNode(element)) {
        const inputRect = element.getBoundingClientRect();
        const textContent = element.value || element.placeholder;
        const isPlaceholder = !element.value;
        if (!textContent) return;
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingTop = parseFloat(style.paddingTop);
        return [
          {
            style:
              isPlaceholder ?
                getComputedStyle(element, "::placeholder")
              : style,
            textContent,
            x: inputRect.x + paddingLeft,
            y: inputRect.y + paddingTop,
            width: inputRect.width - paddingLeft,
            height: inputRect.height - paddingTop,
          },
        ];
      }

      return Array.from(element.childNodes)
        .filter(isTextNode)
        .map((childTextNode) => {
          const textContent = childTextNode.textContent;
          if (!textContent) return;
          const range = document.createRange();
          range.selectNodeContents(childTextNode);
          const textRect = range.getBoundingClientRect();

          if (textRect.width > 0 && textRect.height > 0) {
            const maxX = x + width;
            const maxY = y + height;
            const textMaxX = textRect.x + textRect.width;
            const textMaxY = textRect.y + textRect.height;
            const textxMaxWidth = Math.min(textMaxX, maxX) - textRect.x;
            const textyMaxHeight = Math.min(textMaxY, maxY) - textRect.y;
            return {
              style: {
                ...style,
                /** This is done to preserve leading spaces */
                whiteSpace: "pre",
              },
              textContent,
              x: textRect.x,
              y: textRect.y,
              /** This ensures the actual visible/non overflown size of text is used */
              width: Math.min(textRect.width, textxMaxWidth),
              height: Math.min(textRect.height, textyMaxHeight),
            };
          }
        })
        .filter(isDefined);
    })(),
  };
};
