import { SVG_NAMESPACE } from "../domToSVG";

export const addSVGifCaption = (
  svgDom: SVGElement,
  width: number,
  height: number,
  caption: string,
  getDefs: () => SVGElement,
) => {
  const defs = getDefs();

  // Add CSS for theme-aware styling
  const styleElem = document.createElementNS(SVG_NAMESPACE, "style");
  styleElem.textContent = `
    .caption-background {
      fill: light-dark(#ffffff, #1a1a1a);
      stroke: light-dark(#e0e0e0, #404040);
      stroke-width: 1;
    }
    .caption-text {
      fill: light-dark(#333333, #e0e0e0);
      font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      user-select: none;
    }
    @media (prefers-color-scheme: dark) {
      .caption-background-fallback { fill: #1a1a1a; stroke: #404040; }
      .caption-text-fallback { fill: #e0e0e0; }
    }
  `;
  defs.appendChild(styleElem);

  // Create caption group
  const captionGroup = document.createElementNS(SVG_NAMESPACE, "g");
  captionGroup.setAttribute("class", "caption");

  // Create temporary text element to measure dimensions
  const tempText = document.createElementNS(SVG_NAMESPACE, "text");
  tempText.setAttribute(
    "font-family",
    "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  );
  tempText.setAttribute("font-size", "14");
  tempText.textContent = caption;
  tempText.setAttribute("visibility", "hidden");
  svgDom.appendChild(tempText);

  // Get text dimensions (fallback if getBBox not available)
  let textWidth = 0;
  let textHeight = 16;
  try {
    const bbox = tempText.getBBox();
    textWidth = bbox.width;
    textHeight = bbox.height;
  } catch (e) {
    // Rough estimate: average char width * length
    textWidth = caption.length * 8;
  }
  svgDom.removeChild(tempText);

  // Background dimensions with padding
  const padding = { x: 12, y: 8 };
  const bgWidth = textWidth + padding.x * 2;
  const bgHeight = textHeight + padding.y * 2;
  const bgX = width / 2 - bgWidth / 2;
  const bgY = height - bgHeight - 10;
  const borderRadius = 4;

  // Create background rectangle
  const bgRect = document.createElementNS(SVG_NAMESPACE, "rect");
  bgRect.setAttribute("x", String(bgX));
  bgRect.setAttribute("y", String(bgY));
  bgRect.setAttribute("width", String(bgWidth));
  bgRect.setAttribute("height", String(bgHeight));
  bgRect.setAttribute("rx", String(borderRadius));
  bgRect.setAttribute("ry", String(borderRadius));
  bgRect.setAttribute(
    "class",
    "caption-background caption-background-fallback",
  );
  captionGroup.appendChild(bgRect);

  // Create text element
  const captionElem = document.createElementNS(SVG_NAMESPACE, "text");
  captionElem.setAttribute("x", String(width / 2));
  captionElem.setAttribute("y", String(bgY + bgHeight / 2 + textHeight / 3));
  captionElem.setAttribute("text-anchor", "middle");
  captionElem.setAttribute("class", "caption-text caption-text-fallback");
  captionElem.textContent = caption;
  captionGroup.appendChild(captionElem);

  svgDom.appendChild(captionGroup);
};
