import { SVG_NAMESPACE } from "./domToSVG";
import type { SVGContext } from "./elementToSVG";

export function hasBorder(style) {
  return (
    style.borderTopWidth !== "0px" ||
    style.borderRightWidth !== "0px" ||
    style.borderBottomWidth !== "0px" ||
    style.borderLeftWidth !== "0px"
  );
}
function parseBorderRadius(borderRadiusValue) {
  if (!borderRadiusValue || borderRadiusValue === "0px") return "0";

  const borderRadiusValues: number[] = borderRadiusValue
    .split(" ")
    .map((value) => parseFloat(value));
  const maxRadius = Math.max(...borderRadiusValues);
  return maxRadius;
}

export const addBorders = (
  makeRect: () => SVGRectElement,
  g,
  x,
  y,
  width,
  height,
  style,
) => {
  // For complex borders with different radii, we'll use a simpler approach
  // Create a rectangle with border and no fill
  if (style.borderRadius && style.borderRadius !== "0px") {
    const rect = makeRect();
    if (!getBackgroundColor(style)) {
      rect.setAttribute("fill", "none");
    }

    // Use a simplified approach for rx/ry
    const simplifiedRadius = parseBorderRadius(style.borderRadius);
    rect.setAttribute("rx", simplifiedRadius);
    rect.setAttribute("ry", simplifiedRadius);

    // Use the most prominent border properties
    const borderWidth = Math.max(
      parseFloat(style.borderTopWidth) || 0,
      parseFloat(style.borderRightWidth) || 0,
      parseFloat(style.borderBottomWidth) || 0,
      parseFloat(style.borderLeftWidth) || 0,
    );

    rect.setAttribute("stroke-width", borderWidth + "px");

    // Use the most prominent color or first available
    let borderColor = style.borderTopColor;
    if (style.borderTopWidth === "0px") {
      if (style.borderRightWidth !== "0px")
        borderColor = style.borderRightColor;
      else if (style.borderBottomWidth !== "0px")
        borderColor = style.borderBottomColor;
      else if (style.borderLeftWidth !== "0px")
        borderColor = style.borderLeftColor;
    }

    rect.setAttribute("stroke", borderColor);
    g.appendChild(rect);
    return;
  }

  // For straight borders (no radius), draw individual lines

  // Top border
  if (style.borderTopWidth !== "0px") {
    const topBorder = document.createElementNS(SVG_NAMESPACE, "line");
    topBorder.setAttribute("x1", x);
    topBorder.setAttribute("y1", y);
    topBorder.setAttribute("x2", x + width);
    topBorder.setAttribute("y2", y);
    topBorder.setAttribute("stroke", style.borderTopColor);
    topBorder.setAttribute("stroke-width", style.borderTopWidth);
    g.appendChild(topBorder);
  }

  // Right border
  if (style.borderRightWidth !== "0px") {
    const rightBorder = document.createElementNS(SVG_NAMESPACE, "line");
    rightBorder.setAttribute("x1", x + width);
    rightBorder.setAttribute("y1", y);
    rightBorder.setAttribute("x2", x + width);
    rightBorder.setAttribute("y2", y + height);
    rightBorder.setAttribute("stroke", style.borderRightColor);
    rightBorder.setAttribute("stroke-width", style.borderRightWidth);
    g.appendChild(rightBorder);
  }

  // Bottom border
  if (style.borderBottomWidth !== "0px") {
    const bottomBorder = document.createElementNS(SVG_NAMESPACE, "line");
    bottomBorder.setAttribute("x1", x);
    bottomBorder.setAttribute("y1", y + height);
    bottomBorder.setAttribute("x2", x + width);
    bottomBorder.setAttribute("y2", y + height);
    bottomBorder.setAttribute("stroke", style.borderBottomColor);
    bottomBorder.setAttribute("stroke-width", style.borderBottomWidth);
    g.appendChild(bottomBorder);
  }

  // Left border
  if (style.borderLeftWidth !== "0px") {
    const leftBorder = document.createElementNS(SVG_NAMESPACE, "line");
    leftBorder.setAttribute("x1", x);
    leftBorder.setAttribute("y1", y);
    leftBorder.setAttribute("x2", x);
    leftBorder.setAttribute("y2", y + height);
    leftBorder.setAttribute("stroke", style.borderLeftColor);
    leftBorder.setAttribute("stroke-width", style.borderLeftWidth);
    g.appendChild(leftBorder);
  }
};

export function getBackgroundColor(style: CSSStyleDeclaration) {
  return (
      style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor !== "transparent"
    ) ?
      style.backgroundColor
    : undefined;
}

export const addBackground = (
  makeRect: () => SVGRectElement,
  g: SVGGElement,
  style: CSSStyleDeclaration,
  element: HTMLElement,
  context: SVGContext,
) => {
  const rect = makeRect();
  if (style.borderRadius && style.borderRadius !== "0px") {
    const simplifiedRadius = parseBorderRadius(style.borderRadius);
    rect.setAttribute("rx", simplifiedRadius);
    rect.setAttribute("ry", simplifiedRadius);
  }

  rect.setAttribute("fill", style.backgroundColor);

  g.appendChild(rect);
};
