import { isDefined } from "../../utils";
import { isElementNode, isInputNode, isTextNode } from "./isElementVisible";

export type TextForSVG = {
  style: CSSStyleDeclaration;
  textContent: string;
  textIndent: number | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  isSingleLine: boolean | undefined;
};

export const getTextForSVG = (
  element: HTMLElement,
  style: CSSStyleDeclaration,
  {
    x,
    y,
    width,
    height,
  }: { x: number; y: number; width: number; height: number },
): TextForSVG[] | undefined => {
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
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    return [
      {
        style:
          isPlaceholder ? getComputedStyle(element, "::placeholder") : style,
        textContent,
        x: inputRect.x + paddingLeft + borderLeft,
        y: inputRect.y + paddingTop - borderTop,
        width: inputRect.width - paddingLeft,
        height: inputRect.height - paddingTop,
        textIndent: 0,
        isSingleLine: undefined,
      },
    ];
  }

  // if (element.nodeName === "strong") {
  //   // If the element is a strong tag, we can just return the text content
  //   const textContent = element.textContent;
  //   if (!textContent) return;
  //   const range = document.createRange();
  //   range.selectNodeContents(element);
  //   const textRect = range.getBoundingClientRect();
  //   return [
  //     {
  //       style: {
  //         ...style,
  //         fontWeight: "bold",
  //         whiteSpace: "pre",
  //       },
  //       textContent,
  //       x: textRect.x,
  //       y: textRect.y,
  //       width: textRect.width,
  //       height: textRect.height,
  //     },
  //   ];
  // }

  return Array.from(element.childNodes)
    .filter(isTextNode)
    .map((childTextNode) => {
      const textContent = childTextNode.textContent;
      if (!textContent) return;
      const range = document.createRange();
      range.selectNodeContents(childTextNode);
      const textRect = range.getBoundingClientRect();

      const maxX = x + width;
      const maxY = y + height;
      const textMaxX = textRect.x + textRect.width;
      const textMaxY = textRect.y + textRect.height;
      const textxMaxWidth = Math.min(textMaxX, maxX) - textRect.x;
      const textyMaxHeight = Math.min(textMaxY, maxY) - textRect.y;
      const visibleTextWidth = Math.min(textRect.width, textxMaxWidth);
      const visibleTextHeight = Math.min(textRect.height, textyMaxHeight);
      if (visibleTextWidth && visibleTextHeight) {
        const edgeRects = getTextEdgeRects(childTextNode, textContent.length);
        const textIndent = edgeRects.startCharRect.left - textRect.x;
        const res: TextForSVG = {
          style: {
            ...style,
            /** This is done to preserve leading spaces */
            whiteSpace: "pre",
          },
          textContent,
          x: textRect.x,
          y: textRect.y,
          /** This ensures the actual visible/non overflown size of text is used */
          width: visibleTextWidth,
          height: visibleTextHeight,
          textIndent: Math.max(0, textIndent),
          isSingleLine:
            edgeRects.startCharRect.top === edgeRects.endCharRect.top,
        };
        return res;
      }
    })
    .filter(isDefined);
};

const getTextEdgeRects = (textNode: Text, contentLength: number) => {
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 1);

  const startCharRect = range.getBoundingClientRect();

  range.setStart(textNode, contentLength - 1);
  range.setEnd(textNode, contentLength);

  const endCharRect = range.getBoundingClientRect();

  return { startCharRect, endCharRect };
};

// Function to recursively process text nodes
const getTextNodes = (
  element: HTMLElement,
  parentStyles: Partial<CSSStyleDeclaration>,
) => {
  const computedStyles = window.getComputedStyle(element);

  // Merge parent styles with current element styles
  const currentStyles = {
    fontSize: computedStyles.fontSize,
    fontFamily: computedStyles.fontFamily,
    fontWeight: computedStyles.fontWeight,
    fontStyle: computedStyles.fontStyle,
    color: computedStyles.color,
    ...parentStyles,
  };

  return Array.from(element.childNodes)
    .map((node) => {
      if (isTextNode(node) && node.textContent) {
        const text = node.textContent.trim();
        if (text) {
          // Create a range for this text node
          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();

          return {
            text: text,
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            styles: currentStyles,
            element: element.tagName || "TEXT",
          };
        }
      } else if (isElementNode(node)) {
        // Recursively process child elements
        getTextNodes(node, currentStyles);
      }
    })
    .filter(isDefined);
};
