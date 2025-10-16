import { isDefined } from "../../../utils";
import {
  isElementNode,
  isInputOrTextAreaNode,
  isTextNode,
} from "../isElementVisible";

export type TextForSVG = {
  style: CSSStyleDeclaration;
  textContent: string;
  textIndent: number | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  isSingleLine: boolean | undefined;
  numberOfLines?: number;
  element: HTMLElement;
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
  if (isInputOrTextAreaNode(element)) {
    const inputRect = element.getBoundingClientRect();
    let textContent = element.value || element.placeholder;
    if (
      (element.type === "date" || element.type === "datetime-local") &&
      element.value
    ) {
      try {
        textContent = new Date(element.value).toLocaleString();
      } catch {}
    }
    const isPlaceholder = !element.value;
    if (!textContent) return;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTop) || 0;
    const borderBottom = parseFloat(style.borderBottom) || 0;
    const contentHeight =
      inputRect.height - paddingTop - paddingBottom - borderTop - borderBottom;
    const actualStyle =
      isPlaceholder ? getComputedStyle(element, "::placeholder") : style;
    const fontSize = parseFloat(actualStyle.fontSize);
    const fontYPadding = Math.max(0, contentHeight - fontSize);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;

    const yTextOffset = -paddingBottom - borderBottom - fontYPadding / 2 - 2;
    const isTextArea = element instanceof HTMLTextAreaElement;
    const y =
      isTextArea ?
        inputRect.y + paddingTop + fontSize + borderTop + 2
      : inputRect.y + inputRect.height + yTextOffset;
    const result = [
      {
        style: actualStyle,
        textContent,
        x: inputRect.x + paddingLeft + borderLeft,
        y,
        width: inputRect.width - paddingLeft,
        height: inputRect.height - paddingTop,
        textIndent: 0,
        isSingleLine: undefined,
        element,
      },
    ];
    return result;
  }

  return Array.from(element.childNodes)
    .map((childTextNode, index) => {
      if (!isTextNode(childTextNode)) return;
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
      const spanHeight =
        element instanceof HTMLSpanElement ? element.clientHeight : undefined;
      const numberOfLines = range.getClientRects().length;
      if (visibleTextWidth && visibleTextHeight) {
        const edgeRects = getTextEdgeRects(childTextNode, textContent.length);
        const textIndent = edgeRects.startCharRect.left - textRect.x;
        const res: TextForSVG = {
          style: {
            ...style,
            /** This is done to preserve leading spaces between spans of the same text block */
            whiteSpace: index ? "pre" : style.whiteSpace,
          },
          textContent,
          x: textRect.x,
          y: textRect.y,
          /** This ensures the actual visible/non overflown size of text is used */
          width: visibleTextWidth,
          height: spanHeight ?? visibleTextHeight,
          textIndent: Math.max(0, textIndent),
          isSingleLine:
            edgeRects.startCharRect.top === edgeRects.endCharRect.top,
          numberOfLines,
          element,
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

const calculateVerticalPosition = (inputElement: HTMLInputElement) => {
  const computedStyle = window.getComputedStyle(inputElement);

  // Get dimensions
  const inputHeight = inputElement.offsetHeight;
  const fontSize = parseFloat(computedStyle.fontSize);
  const lineHeight =
    computedStyle.lineHeight === "normal" ?
      fontSize * 1.2
    : parseFloat(computedStyle.lineHeight);

  // Get padding
  const paddingTop = parseFloat(computedStyle.paddingTop);
  const paddingBottom = parseFloat(computedStyle.paddingBottom);
  const borderTop = parseFloat(computedStyle.borderTopWidth);
  const borderBottom = parseFloat(computedStyle.borderBottomWidth);

  // Calculate available content height
  const contentHeight =
    inputHeight - paddingTop - paddingBottom - borderTop - borderBottom;

  // Calculate vertical center position
  const textVerticalCenter =
    paddingTop + borderTop + (contentHeight - lineHeight) / 2;

  return {
    textTop: textVerticalCenter,
    textCenter: textVerticalCenter + lineHeight / 2,
    textBottom: textVerticalCenter + lineHeight,
    contentHeight: contentHeight,
    lineHeight: lineHeight,
  };
};
