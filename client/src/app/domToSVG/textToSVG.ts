import { tout } from "../../utils";
import { SVG_NAMESPACE } from "./domToSVG";
import type { SVGContext } from "./elementToSVG";
const _singleLineEllipsis = "_singleLineEllipsis" as const;
const TEXT_WIDTH_ATTR = "data-text-width";
const TEXT_HEIGHT_ATTR = "data-text-height";

const getLineBreakParts = (content: string) => content.split(/[\s\-–—]+/);
const getLineBreakPartsWithDelimiters = (content: string) =>
  content.split(/([\s\-–—:]+)/);

export const textToSVG = (
  element: HTMLElement,
  g: SVGGElement,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CSSStyleDeclaration,
  context: SVGContext,
) => {
  if (!content.trim()) return;
  g.setAttribute(TEXT_WIDTH_ATTR, width.toString());
  g.setAttribute(TEXT_HEIGHT_ATTR, height.toString());
  const textNode = document.createElementNS(SVG_NAMESPACE, "text");

  textNode.setAttribute("x", x);
  const fontSize = parseFloat(style.fontSize);
  const inputYFix =
    (
      element.tagName.toLowerCase() === "input" &&
      content !== (element as HTMLInputElement).placeholder
    ) ?
      fontSize * 0.25
    : 0;
  textNode.setAttribute("y", y + fontSize + inputYFix);

  textNode.setAttribute("fill", style.color);
  textNode.setAttribute("font-family", style.fontFamily);
  textNode.setAttribute("font-size", style.fontSize);
  textNode.setAttribute("font-weight", style.fontWeight);
  textNode.setAttribute("text-decoration", style.textDecoration);
  textNode.style.lineHeight = style.lineHeight;
  textNode.style.whiteSpace = style.whiteSpace;
  if (
    style.textOverflow === "ellipsis" &&
    (style.whiteSpace === "nowrap" || getLineBreakParts(content).length === 1)
  ) {
    textNode[_singleLineEllipsis] = true;
  }
  textNode.setAttribute("text-anchor", "start");

  textNode.textContent = content;

  g.appendChild(textNode);
};

const tolerance = 2;
const wrapTextIfOverflowing = (
  textNode: SVGTextElement,
  width: number,
  height: number,
  content: string,
) => {
  const currTextLength = textNode.getComputedTextLength();
  if (currTextLength <= width + tolerance) {
    return;
  } else if (textNode[_singleLineEllipsis]) {
    do {
      content = content.slice(0, -1);
      textNode.textContent = content + "...";
    } while (
      textNode.getComputedTextLength() > width + tolerance &&
      content.length
    );
    return;
  }
  textNode.textContent = "";
  let line: string[] = [];
  let lineNumber = -1;
  const wordsWithDelimiters = getLineBreakPartsWithDelimiters(content);
  const fontSize = textNode.getAttribute("font-size") || "16";
  const lineHeightPx =
    parseFloat(textNode.style.lineHeight) || 1.1 * parseFloat(fontSize);
  const x = textNode.getAttribute("x") || "0";
  const y = textNode.getAttribute("y") || "0";
  const maxLines = Math.floor(height / lineHeightPx);
  let tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
  tspan.setAttribute("x", x);
  tspan.setAttribute("y", y);
  textNode.appendChild(tspan);
  for (let i = 0; i < wordsWithDelimiters.length; i++) {
    const word = wordsWithDelimiters[i]!;
    line.push(word);

    tspan.textContent = line.join("");
    const textLen = tspan.getComputedTextLength();

    if (textLen > width + tolerance) {
      line.pop(); // Remove the word that caused overflow

      // Set content for current tspan
      tspan.textContent = line.join("");

      // Move to next line if possible
      lineNumber++;
      if (lineNumber >= maxLines) {
        // Add ellipsis to indicate truncation if there's room
        if (tspan.textContent && tspan.getComputedTextLength() < width - 10) {
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
  if (!svg.isConnected) {
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.zIndex = "9999";
    document.body.appendChild(svg);
  }

  unnestRedundantGElements(svg);
  svg.querySelectorAll("text").forEach((text) => {
    const parentG = text.closest<SVGGElement>(`g[${TEXT_WIDTH_ATTR}]`);
    const textWidth = parentG?.getAttribute(TEXT_WIDTH_ATTR);
    const textHeight = parentG?.getAttribute(TEXT_HEIGHT_ATTR);
    if (!text.textContent || !parentG || !textWidth || !textHeight) return;

    wrapTextIfOverflowing(
      text,
      +textWidth,
      +textHeight,
      text.textContent || "",
    );
  });

  if (svg.isConnected) {
    await tout(1000);
    svg.remove();
  }
};
