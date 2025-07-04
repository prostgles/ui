import { includes } from "../../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { tout } from "../../../utils";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGScreenshotNodeType } from "../domToThemeAwareSVG";
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
  } = textInfo;
  const style = placeholderOrElementStyle;
  if (!content.trim()) return;
  const textNode = document.createElementNS(SVG_NAMESPACE, "text");
  (textNode as SVGScreenshotNodeType)._bboxCode = bboxCode;
  (textNode as SVGScreenshotNodeType)._textInfo = textInfo;
  textNode.setAttribute(TEXT_WIDTH_ATTR, width);
  textNode.setAttribute(TEXT_HEIGHT_ATTR, height);
  textNode.setAttribute("x", x);

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
  const isInputElement = element instanceof HTMLInputElement;
  textNode.setAttribute("y", (isInputElement ? y : y + fontSize) - 2);
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
    (includes(textNodeStyle.whiteSpace, nonWrappingWhiteSpaces) || isSingleLine)
  ) {
    textNode[_singleLineEllipsis] = true;
  }
  textNode.setAttribute("text-anchor", "start");

  // Ensures overflowing text is wrapped correctly
  textNode.textContent =
    textNodeStyle.whiteSpace === "pre" ? content.trimEnd() : content.trim();

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
  const { textIndent = 0, isSingleLine, style } = textNode._textInfo ?? {};

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
  let lineNumber = -1;
  const wordsWithDelimiters = getLineBreakPartsWithDelimiters(content).filter(
    (w) => w !== "",
  );
  const fontSize = textNode.getAttribute("font-size") || "16";
  const lineHeightPx =
    parseFloat(textNode.style.lineHeight) || 1.1 * parseFloat(fontSize);
  const x = parseFloat(textNode.getAttribute("x") || "0");
  const maxLines = Math.floor(height / lineHeightPx);
  let tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
  tspan.setAttribute("x", x + textIndent);
  tspan.setAttribute("dy", 0);
  tspan.textContent =
    style?.whiteSpace === "pre" ? content : content.trimStart();
  textNode.appendChild(tspan);

  const willNotWrap =
    isSingleLine || textNode._textInfo?.element instanceof HTMLInputElement;
  if (willNotWrap) {
    return;
  }
  for (let wordIndex = 0; wordIndex < wordsWithDelimiters.length; wordIndex++) {
    const isFirstLine = lineNumber === -1;
    const currentLineWidth = isFirstLine ? width - textIndent : width;
    const word = wordsWithDelimiters[wordIndex]!;
    line.push(word);

    const setTextContent = () => {
      tspan.textContent =
        isFirstLine ? line.join("") : line.join("").trimStart();
    };

    setTextContent();
    const textLen = tspan.getComputedTextLength();

    if (textLen > currentLineWidth + tolerance) {
      line.pop(); // Remove the word that caused overflow

      setTextContent();

      // Move to next line if possible
      lineNumber++;
      if (lineNumber >= maxLines) {
        // Add ellipsis to indicate truncation if there's room
        if (
          tspan.textContent &&
          tspan.getComputedTextLength() < currentLineWidth - 10
        ) {
          tspan.textContent += "...";
          textNode.removeChild(tspan);
        }
        return;
      }

      // Create new tspan for next line
      line = [word];
      tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
      tspan.setAttribute("x", x);
      tspan.setAttribute("dy", lineHeightPx + "px");
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

export const wrapAllSVGText = async (svg: SVGElement) => {
  /** Must render svg to ensure the text length calcs work */
  const topStyle = {
    position: "absolute",
    top: "0",
    left: "0",
    zIndex: "9999",
  } as const;
  if (!svg.isConnected) {
    Object.entries(topStyle).forEach(([key, value]) => {
      svg.style[key] = value;
    });
    document.body.appendChild(svg);
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

  if (svg.isConnected) {
    await tout(1000);
    svg.removeAttribute("style");
    svg.remove();
  }
};
