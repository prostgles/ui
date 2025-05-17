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
) => {
  const style = window.getComputedStyle(element);
  const bbox = element.getBoundingClientRect();

  // Calculate absolute position
  const x = bbox.left + context.offsetX;
  const y = bbox.top + context.offsetY;
  const width = bbox.width;
  const height = bbox.height;
  const isVisible = isElementVisible(element);
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
  const border = hasBorder(style);
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
    background,
    border,
    childAffectingStyles,
    image,
    text: (() => {
      const elemParentRect = element.parentElement?.getBoundingClientRect();
      const width = Math.min(
        // element.parentElement?.clientWidth ?? 0,
        elemParentRect?.width ?? 0,
        bbox.width,
      );
      const height = Math.min(elemParentRect?.height ?? 0, bbox.height);
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
              : undefined,
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
            return {
              style: undefined,
              textContent,
              x: textRect.x,
              y: textRect.y,
              width,
              height,
            };
          }
        })
        .filter(isDefined);
    })(),
  };
};
