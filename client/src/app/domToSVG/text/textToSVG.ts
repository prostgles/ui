import { includes } from "prostgles-types";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGScreenshotNodeType } from "../domToThemeAwareSVG";
import { isInputOrTextAreaNode } from "../utils/isElementVisible";
import { toFixed } from "../utils/toFixed";
import type { TextForSVG } from "./getTextForSVG";
const _singleLineEllipsis = "_singleLineEllipsis" as const;
const TEXT_WIDTH_ATTR = "data-text-width";
const TEXT_HEIGHT_ATTR = "data-text-height";

const getLineBreakPartsWithDelimiters = (content: string) =>
  content.split(/([\s\-–—:]+)/);

export const textToSVG = (
  element: HTMLElement,
  g: SVGGElement,
  textInfo: TextForSVG,
  elementStyle: CSSStyleDeclaration,
  bboxCode: string,
) => {
  const {
    height,
    style: placeholderOrElementStyle,
    textContent: content,
    width,
    x,
    y,
    isSingleLine,
    numberOfLines,
  } = textInfo;
  const style = placeholderOrElementStyle;
  if (!content.trim()) return;
  const textNode = document.createElementNS(SVG_NAMESPACE, "text");
  (textNode as SVGScreenshotNodeType)._bboxCode = bboxCode;
  (textNode as SVGScreenshotNodeType)._textInfo = textInfo;
  textNode.setAttribute(TEXT_WIDTH_ATTR, toFixed(width));
  textNode.setAttribute(TEXT_HEIGHT_ATTR, toFixed(height));
  textNode.setAttribute("x", toFixed(x));

  /** In firefox it seems the text nodes don't have font size */
  const textNodeStyle = {
    color: style.color || elementStyle.color,
    fontFamily: style.fontFamily || elementStyle.fontFamily,
    fontSize: style.fontSize || elementStyle.fontSize,
    fontWeight: style.fontWeight || elementStyle.fontWeight,
    letterSpacing: style.letterSpacing || elementStyle.letterSpacing,
    textDecoration: style.textDecoration || elementStyle.textDecoration,
    lineHeight: style.lineHeight || elementStyle.lineHeight,
    whiteSpace: style.whiteSpace || elementStyle.whiteSpace,
    textOverflow: style.textOverflow || elementStyle.textOverflow,
    textTransform: style.textTransform || elementStyle.textTransform,
    fontStyle: style.fontStyle || elementStyle.fontStyle,
  };
  const fontSize = parseFloat(textNodeStyle.fontSize);
  const isInputElement = isInputOrTextAreaNode(element);
  textNode.setAttribute("y", toFixed((isInputElement ? y : y + fontSize) - 2));
  textNode.setAttribute("fill", textNodeStyle.color);
  textNode.setAttribute("font-family", textNodeStyle.fontFamily);
  textNode.setAttribute("font-size", textNodeStyle.fontSize);
  textNode.setAttribute("font-weight", textNodeStyle.fontWeight);
  textNode.setAttribute("font-style", textNodeStyle.fontStyle);
  textNode.setAttribute("letter-spacing", textNodeStyle.letterSpacing);
  textNode.setAttribute("text-decoration", textNodeStyle.textDecoration);
  textNode.style.lineHeight = textNodeStyle.lineHeight;
  textNode.style.whiteSpace = textNodeStyle.whiteSpace;
  textNode.style.textTransform = textNodeStyle.textTransform;
  const nonWrappingWhiteSpaces = ["nowrap", "pre", "reverse", "reverse-wrap"];
  if (
    textNodeStyle.textOverflow === "ellipsis" &&
    (includes(nonWrappingWhiteSpaces, textNodeStyle.whiteSpace) || isSingleLine)
  ) {
    textNode[_singleLineEllipsis] = true;
  }
  textNode.setAttribute("text-anchor", "start");

  textNode.textContent = content.trimEnd();

  g.appendChild(textNode);
};

const tolerance = 2;
const wrapTextIfOverflowing = (
  textNode: Extract<SVGScreenshotNodeType, SVGTextElement>,
  width: number,
  height: number,
  content: string,
) => {
  const currTextLength = textNode.getComputedTextLength();
  const {
    textIndent = 0,
    isSingleLine,
    style,
    numberOfLines,
  } = textNode._textInfo ?? {};

  if (currTextLength <= width + tolerance && !textIndent) {
    return;
  } else if (textNode[_singleLineEllipsis]) {
    while (
      textNode.getComputedTextLength() > width + tolerance &&
      content.length
    ) {
      content = content.slice(0, -1);
      textNode.textContent = content + "...";
    }
    return;
  }
  textNode.textContent = "";
  let line: string[] = [];
  const wordsWithDelimiters = getLineBreakPartsWithDelimiters(content).filter(
    (w) => w !== "",
  );
  const fontSize = textNode.getAttribute("font-size") || "16";
  const lineHeightPx =
    parseFloat(textNode.style.lineHeight) || 1.1 * parseFloat(fontSize);
  const x = parseFloat(textNode.getAttribute("x") || "0");
  const maxLines = numberOfLines ?? Math.floor(height / lineHeightPx);
  let tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
  tspan.setAttribute("x", toFixed(x + textIndent));
  tspan.setAttribute("dy", 0);
  tspan.textContent =
    style?.whiteSpace === "pre" ? content : content.trimStart();
  textNode.appendChild(tspan);

  const willNotWrap =
    isSingleLine || textNode._textInfo?.element instanceof HTMLInputElement;
  if (willNotWrap) {
    return;
  }
  let lineNumber = 1;
  const hasTextOverflowEllipsis =
    style?.textOverflow === "ellipsis" && style.overflow === "hidden";
  for (let wordIndex = 0; wordIndex < wordsWithDelimiters.length; wordIndex++) {
    const isFirstLine = lineNumber === 1;
    const currentLineWidth = isFirstLine ? width - textIndent : width;
    const word = wordsWithDelimiters[wordIndex]!;
    line.push(word);

    const setTextContent = () => {
      tspan.textContent =
        isFirstLine ? line.join("") : line.join("").trimStart();
    };

    setTextContent();
    const textLen = tspan.getComputedTextLength();

    const textIsOverflowing = textLen > currentLineWidth + tolerance;
    const cannotWrapMoreBecauseItsASingleWord = line.length === 1;
    if (textIsOverflowing && !cannotWrapMoreBecauseItsASingleWord) {
      if (
        numberOfLines &&
        lineNumber === numberOfLines &&
        !hasTextOverflowEllipsis
      ) {
        return;
      }

      line.pop(); // Remove the word that caused overflow

      setTextContent();

      // Move to next line if possible
      lineNumber++;

      if (lineNumber >= maxLines && hasTextOverflowEllipsis) {
        // Add ellipsis to indicate truncation if there's room
        if (
          tspan.textContent &&
          tspan.getComputedTextLength() < currentLineWidth - 10
        ) {
          tspan.textContent += "...";
        }
        return;
      }

      // Create new tspan for next line
      line = [word];
      tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
      tspan.setAttribute("x", toFixed(x));
      tspan.setAttribute("dy", toFixed(lineHeightPx) + "px");
      textNode.appendChild(tspan);
      tspan.textContent = word;
    }
  }
};

const unnestRedundantGElements = (svg: SVGElement) => {
  const gElements = svg.querySelectorAll("g");

  gElements.forEach((gElement) => {
    if (
      gElement.childElementCount === 1 &&
      gElement.firstElementChild?.tagName.toLowerCase() === "g" &&
      gElement.attributes.length === 0
    ) {
      const childG = gElement.firstElementChild as SVGElement;

      gElement.parentNode?.replaceChild(childG, gElement);

      unnestRedundantGElements(svg);
    }
  });

  return svg;
};

export const wrapAllSVGText = (svg: SVGElement) => {
  if (!svg.isConnected) {
    throw new Error("SVG must be in the DOM for bbox calculations");
  }

  unnestRedundantGElements(svg);
  svg
    .querySelectorAll<SVGTextElement>(`text[${TEXT_WIDTH_ATTR}]`)
    .forEach((text) => {
      const textWidth = text.getAttribute(TEXT_WIDTH_ATTR);
      const textHeight = text.getAttribute(TEXT_HEIGHT_ATTR);
      if (!text.textContent || !textWidth || !textHeight) return;

      wrapTextIfOverflowing(
        text,
        +textWidth,
        +textHeight,
        text.textContent || "",
      );
    });
  svg
    .querySelectorAll<SVGTextElement>(`text[${TEXT_WIDTH_ATTR}]`)
    .forEach((text) => {
      text.removeAttribute(TEXT_WIDTH_ATTR);
      text.removeAttribute(TEXT_HEIGHT_ATTR);
    });
};

/**
 * Appends svg to document to ensure the bbox/text length calcs work
 * */
export const renderSvg = (svg: SVGElement) => {
  const topStyle = {
    position: "absolute",
    top: "0",
    left: "0",
    zIndex: "9999",
  } as const;

  const getIsAppended = () => document.body.contains(svg);

  if (!getIsAppended()) {
    Object.entries(topStyle).forEach(([key, value]) => {
      svg.style[key] = value;
    });
    document.body.appendChild(svg);
  }

  return {
    remove: () => {
      if (getIsAppended()) {
        svg.removeAttribute("style");
        svg.remove();
      }
    },
  };
};
