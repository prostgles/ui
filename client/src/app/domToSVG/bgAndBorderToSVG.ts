import { SVG_NAMESPACE } from "./domToSVG";

export function hasBorder(style) {
  return (
    style.borderTopWidth !== "0px" ||
    style.borderRightWidth !== "0px" ||
    style.borderBottomWidth !== "0px" ||
    style.borderLeftWidth !== "0px"
  );
}

export const addSpecificBorders = (
  g,
  x,
  y,
  width,
  height,
  style: CSSStyleDeclaration,
) => {
  const drawBorder = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ) => {
    const border = document.createElementNS(SVG_NAMESPACE, "line");
    border.setAttribute("x1", x1);
    border.setAttribute("y1", y1);
    border.setAttribute("x2", x2);
    border.setAttribute("y2", y2);
    border.setAttribute("stroke", color);
    border.setAttribute("stroke-width", width);
    g.appendChild(border);
  };

  const {
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    borderTopColor,
    borderRightColor,
    borderBottomColor,
    borderLeftColor,
  } = style;

  // Top border
  if (borderTopWidth !== "0px") {
    const borderWidth = parseFloat(borderTopWidth);
    drawBorder(
      x,
      /** Given that the x,y,w,h refer to the rectangle edges, we need to subtract half width of the overflowing border to match the dimensions */
      y + borderWidth / 2,
      x + width,
      y + borderWidth / 2,
      borderTopColor,
      borderWidth,
    );
  }

  // Right border
  if (borderRightWidth !== "0px") {
    const borderWidth = parseFloat(borderRightWidth);
    drawBorder(
      x - borderWidth / 2 + width,
      y,
      x - borderWidth / 2 + width,
      y + height,
      borderRightColor,
      borderWidth,
    );
  }

  // Bottom border
  if (borderBottomWidth !== "0px") {
    const borderWidth = parseFloat(borderBottomWidth);

    drawBorder(
      x,
      y - borderWidth / 2 + height,
      x + width,
      y - borderWidth / 2 + height,
      borderBottomColor,
      borderWidth,
    );
  }

  // Left border
  if (borderLeftWidth !== "0px") {
    const borderWidth = parseFloat(borderLeftWidth);
    drawBorder(
      x + borderWidth / 2,
      y,
      x + borderWidth / 2,
      y + height,
      borderLeftColor,
      borderWidth,
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

export const getBackdropFilter = (style: CSSStyleDeclaration) => {
  return style.backdropFilter && style.backdropFilter !== "none" ?
      style.backdropFilter
    : undefined;
};

/**
 * Build a <path> "d" attribute for a rectangle with arbitrary corner radii.
 * Accounts for border width and ensures crisp edges by using whole numbers
 * and half-pixel offsets when needed.
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

  const toFixed = (num: number) => {
    return num.toFixed(2);
  };

  /* Path – clockwise, starting in the top-left corner */
  return [
    `M${toFixed(x + rtl)},${toFixed(y)}`, // start
    `H${toFixed(x + w - rtr)}`, // top
    rtr ?
      `A${toFixed(rtr)},${toFixed(rtr)} 0 0 1 ${toFixed(x + w)},${toFixed(y + rtr)}`
    : "",
    `V${toFixed(y + h - rbr)}`, // right
    rbr ?
      `A${toFixed(rbr)},${toFixed(rbr)} 0 0 1 ${toFixed(x + w - rbr)},${toFixed(y + h)}`
    : "",
    `H${toFixed(x + rbl)}`, // bottom
    rbl ?
      `A${toFixed(rbl)},${toFixed(rbl)} 0 0 1 ${toFixed(x)},${toFixed(y + h - rbl)}`
    : "",
    `V${toFixed(y + rtl)}`, // left
    rtl ?
      `A${toFixed(rtl)},${toFixed(rtl)} 0 0 1 ${toFixed(x + rtl)},${toFixed(y)}`
    : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};
