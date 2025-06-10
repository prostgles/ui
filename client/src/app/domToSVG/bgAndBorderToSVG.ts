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

// /**
//  * Build a <path> “d” attribute for a rectangle with arbitrary corner radii.
//  */
// export const roundedRectPath = (
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   [rtl, rtr, rbr, rbl]: [number, number, number, number],
// ) => {
//   /* Clamp radii so that they never overlap (same thing the browser does) */
//   const sumH = rtl + rtr;
//   const sumH2 = rbl + rbr;
//   const sumV = rtl + rbl;
//   const sumV2 = rtr + rbr;

//   if (sumH > w) {
//     const scale = w / sumH;
//     rtl *= scale;
//     rtr *= scale;
//   }
//   if (sumH2 > w) {
//     const scale = w / sumH2;
//     rbl *= scale;
//     rbr *= scale;
//   }
//   if (sumV > h) {
//     const scale = h / sumV;
//     rtl *= scale;
//     rbl *= scale;
//   }
//   if (sumV2 > h) {
//     const scale = h / sumV2;
//     rtr *= scale;
//     rbr *= scale;
//   }

//   /* Path – clockwise, starting in the top-left corner */
//   return [
//     `M${x + rtl},${y}`, // start
//     `H${x + w - rtr}`, // top
//     rtr ? `A${rtr},${rtr} 0 0 1 ${x + w},${y + rtr}` : "",
//     `V${y + h - rbr}`, // right
//     rbr ? `A${rbr},${rbr} 0 0 1 ${x + w - rbr},${y + h}` : "",
//     `H${x + rbl}`, // bottom
//     rbl ? `A${rbl},${rbl} 0 0 1 ${x},${y + h - rbl}` : "",
//     `V${y + rtl}`, // left
//     rtl ? `A${rtl},${rtl} 0 0 1 ${x + rtl},${y}` : "",
//     "Z",
//   ]
//     .filter(Boolean)
//     .join(" ");
// };
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
  borderWidth: number,
) => {
  // Calculate the stroke offset (half the border width)
  const strokeOffset = borderWidth / 2;

  // Adjust bbox for stroke - stroke is centered on the path
  const innerX = x + strokeOffset;
  const innerY = y + strokeOffset;
  const innerW = w - borderWidth;
  const innerH = h - borderWidth;

  // Ensure crisp edges by rounding coordinates and applying half-pixel offset if needed
  const crispX =
    borderWidth % 2 === 1 ? Math.round(innerX) + 0.5 : Math.round(innerX);
  const crispY =
    borderWidth % 2 === 1 ? Math.round(innerY) + 0.5 : Math.round(innerY);
  const crispW = Math.round(innerW);
  const crispH = Math.round(innerH);

  // Adjust radii for border width (radii are measured from the stroke center)
  let adjustedRtl = Math.max(0, rtl - strokeOffset);
  let adjustedRtr = Math.max(0, rtr - strokeOffset);
  let adjustedRbr = Math.max(0, rbr - strokeOffset);
  let adjustedRbl = Math.max(0, rbl - strokeOffset);

  /* Clamp radii so that they never overlap (same thing the browser does) */
  const sumH = adjustedRtl + adjustedRtr;
  const sumH2 = adjustedRbl + adjustedRbr;
  const sumV = adjustedRtl + adjustedRbl;
  const sumV2 = adjustedRtr + adjustedRbr;

  if (sumH > crispW) {
    const scale = crispW / sumH;
    adjustedRtl *= scale;
    adjustedRtr *= scale;
  }
  if (sumH2 > crispW) {
    const scale = crispW / sumH2;
    adjustedRbl *= scale;
    adjustedRbr *= scale;
  }
  if (sumV > crispH) {
    const scale = crispH / sumV;
    adjustedRtl *= scale;
    adjustedRbl *= scale;
  }
  if (sumV2 > crispH) {
    const scale = crispH / sumV2;
    adjustedRtr *= scale;
    adjustedRbr *= scale;
  }

  /* Path – clockwise, starting in the top-left corner */
  return [
    `M${crispX + adjustedRtl},${crispY}`, // start
    `H${crispX + crispW - adjustedRtr}`, // top
    adjustedRtr ?
      `A${adjustedRtr},${adjustedRtr} 0 0 1 ${crispX + crispW},${crispY + adjustedRtr}`
    : "",
    `V${crispY + crispH - adjustedRbr}`, // right
    adjustedRbr ?
      `A${adjustedRbr},${adjustedRbr} 0 0 1 ${crispX + crispW - adjustedRbr},${crispY + crispH}`
    : "",
    `H${crispX + adjustedRbl}`, // bottom
    adjustedRbl ?
      `A${adjustedRbl},${adjustedRbl} 0 0 1 ${crispX},${crispY + crispH - adjustedRbl}`
    : "",
    `V${crispY + adjustedRtl}`, // left
    adjustedRtl ?
      `A${adjustedRtl},${adjustedRtl} 0 0 1 ${crispX + adjustedRtl},${crispY}`
    : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};
