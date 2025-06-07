import { SVG_NAMESPACE } from "./domToSVG";

export function hasBorder(style) {
  return (
    style.borderTopWidth !== "0px" ||
    style.borderRightWidth !== "0px" ||
    style.borderBottomWidth !== "0px" ||
    style.borderLeftWidth !== "0px"
  );
}

export const addSpecificBorders = (g, x, y, width, height, style) => {
  const drawBorder = (x1, y1, x2, y2, color, width) => {
    const border = document.createElementNS(SVG_NAMESPACE, "line");
    border.setAttribute("x1", x1);
    border.setAttribute("y1", y1);
    border.setAttribute("x2", x2);
    border.setAttribute("y2", y2);
    border.setAttribute("stroke", color);
    border.setAttribute("stroke-width", width);
    g.appendChild(border);
  };

  // Top border
  if (style.borderTopWidth !== "0px") {
    drawBorder(x, y, x + width, y, style.borderTopColor, style.borderTopWidth);
  }

  // Right border
  if (style.borderRightWidth !== "0px") {
    drawBorder(
      x + width,
      y,
      x + width,
      y + height,
      style.borderRightColor,
      style.borderRightWidth,
    );
  }

  // Bottom border
  if (style.borderBottomWidth !== "0px") {
    drawBorder(
      x,
      y + height,
      x + width,
      y + height,
      style.borderBottomColor,
      style.borderBottomWidth,
    );
  }

  // Left border
  if (style.borderLeftWidth !== "0px") {
    drawBorder(
      x,
      y,
      x,
      y + height,
      style.borderLeftColor,
      style.borderLeftWidth,
    );
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

/**
 * Build a <path> “d” attribute for a rectangle with arbitrary corner radii.
 */
export const roundedRectPath = (
  x: number,
  y: number,
  w: number,
  h: number,
  [rtl, rtr, rbr, rbl]: [number, number, number, number],
) => {
  /* Clamp radii so that they never overlap (same thing the browser does) */
  const sumH = rtl + rtr;
  const sumH2 = rbl + rbr;
  const sumV = rtl + rbl;
  const sumV2 = rtr + rbr;

  if (sumH > w) {
    const scale = w / sumH;
    rtl *= scale;
    rtr *= scale;
  }
  if (sumH2 > w) {
    const scale = w / sumH2;
    rbl *= scale;
    rbr *= scale;
  }
  if (sumV > h) {
    const scale = h / sumV;
    rtl *= scale;
    rbl *= scale;
  }
  if (sumV2 > h) {
    const scale = h / sumV2;
    rtr *= scale;
    rbr *= scale;
  }

  /* Path – clockwise, starting in the top-left corner */
  return [
    `M${x + rtl},${y}`, // start
    `H${x + w - rtr}`, // top
    rtr ? `A${rtr},${rtr} 0 0 1 ${x + w},${y + rtr}` : "",
    `V${y + h - rbr}`, // right
    rbr ? `A${rbr},${rbr} 0 0 1 ${x + w - rbr},${y + h}` : "",
    `H${x + rbl}`, // bottom
    rbl ? `A${rbl},${rbl} 0 0 1 ${x},${y + h - rbl}` : "",
    `V${y + rtl}`, // left
    rtl ? `A${rtl},${rtl} 0 0 1 ${x + rtl},${y}` : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};
