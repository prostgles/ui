import { SVG_NAMESPACE } from "./domToSVG";
const _singleLineEllipsis = "_singleLineEllipsis" as const;
const TEXT_WIDTH_ATTR = "data-text-width";
const TEXT_HEIGHT_ATTR = "data-text-height";

const getLineBreakParts = (content: string) => content.split(/[\s\-–—]+/);

export const textToSVG = (
  g: SVGGElement,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CSSStyleDeclaration,
) => {
  if (!content.trim()) return;

  g.setAttribute(TEXT_WIDTH_ATTR, width.toString());
  g.setAttribute(TEXT_HEIGHT_ATTR, height.toString());
  const textNode = document.createElementNS(SVG_NAMESPACE, "text");

  textNode.setAttribute("x", x);
  textNode.setAttribute("y", y + parseFloat(style.fontSize));

  textNode.setAttribute("fill", style.color);
  textNode.setAttribute("font-family", style.fontFamily);
  textNode.setAttribute("font-size", style.fontSize);
  textNode.setAttribute("font-weight", style.fontWeight);
  textNode.setAttribute("text-decoration", style.textDecoration);

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
  defs: SVGDefsElement,
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
  const words = getLineBreakParts(content);
  const lineHeight = 1.1;
  const x = textNode.getAttribute("x") || "0";
  const y = textNode.getAttribute("y") || "0";
  const fontSize = textNode.getAttribute("font-size") || "16";
  const maxLines = Math.floor(height / (lineHeight * parseFloat(fontSize)));
  let tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
  tspan.setAttribute("x", x);
  tspan.setAttribute("y", y);
  textNode.appendChild(tspan);

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    line.push(word);

    tspan.textContent = line.join(" ");
    const textLen = tspan.getComputedTextLength();

    if (textLen > width + tolerance) {
      line.pop(); // Remove the word that caused overflow

      // Set content for current tspan
      tspan.textContent = line.join(" ");

      // Move to next line if possible
      lineNumber++;
      if (lineNumber + 1 >= maxLines) {
        // Add ellipsis to indicate truncation if there's room
        if (tspan.textContent && tspan.getComputedTextLength() < width - 10) {
          tspan.textContent = tspan.textContent + "...";
          textNode.removeChild(tspan);
        }
        return;
      }

      // Create new tspan for next line
      line = [word];
      tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
      tspan.setAttribute("x", x);
      tspan.setAttribute("dy", lineHeight + "em");
      textNode.appendChild(tspan);
      tspan.textContent = word;
    }
  }

  if (line.length) {
    const g = textNode.closest<SVGGElement>("g");
    addClipPathToMimickOverflowHidden(defs, g!, {
      x,
      y: textNode.getBBox().y,
      width,
      height,
    });
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
  setTimeout(() => {
    unnestRedundantGElements(svg);
    svg.querySelectorAll("text").forEach((text) => {
      const parentG = text.closest<SVGGElement>(`g[${TEXT_WIDTH_ATTR}]`);
      const textWidth = parentG?.getAttribute(TEXT_WIDTH_ATTR);
      const textHeight = parentG?.getAttribute(TEXT_HEIGHT_ATTR);
      // console.log(parentG?.getAttribute(TEXT_WIDTH_ATTR), text.textContent);
      if (!text.textContent || !parentG || !textWidth || !textHeight) return;
      const defs = svg.querySelector("defs");
      wrapTextIfOverflowing(
        defs as SVGDefsElement,
        text,
        +textWidth,
        +textHeight,
        text.textContent || "",
      );
    });
  }, 2); // Allow time for the SVG to be rendered
};

let clipPathCounter = 0;
const addClipPathToMimickOverflowHidden = (
  defs: SVGDefsElement,
  g: SVGGElement,
  {
    x,
    y,
    width,
    height,
  }: { x: string; y: string | number; width: number; height: number },
) => {
  // Create a unique ID for the clip path
  const clipId = `clip-${clipPathCounter++}`;

  // Create clip path element
  const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
  clipPath.setAttribute("id", clipId);

  // Create a rectangle with the dimensions
  const clipRect = document.createElementNS(SVG_NAMESPACE, "rect");
  clipRect.setAttribute("x", x);
  clipRect.setAttribute("y", y);
  clipRect.setAttribute("width", width);
  clipRect.setAttribute("height", height);

  // Add the rectangle to the clip path
  clipPath.appendChild(clipRect);

  defs.appendChild(clipPath);

  // Apply the clip path to the parent G element
  g.setAttribute("clip-path", `url(#${clipId})`);
};
