import { isDefined } from "prostgles-types";
import { includes } from "../../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { SVG_NAMESPACE } from "../domToSVG";
import type { SVGContext } from "./elementToSVG";
import type { WhatToRenderOnSVG } from "../utils/getWhatToRenderOnSVG";
import { isElementNode } from "../utils/isElementVisible";
import { getRectanglePath } from "./rectangleToSVG";

export const addOverflowClipPath = (
  element: HTMLElement,
  style: CSSStyleDeclaration,
  g: SVGGElement,
  {
    x,
    height,
    width,
    y,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  context: SVGContext,
  whatToRender: Pick<WhatToRenderOnSVG, "border" | "background">,
) => {
  /**
   * If overflow is set to hidden, we need to add a clip path to the group
   */
  if (!mustAddClipPath(element, style)) return;
  const borderWidth =
    whatToRender.border?.type === "border" ?
      whatToRender.border.borderWidth
    : 0;

  /**
   * This is to ensure we don't cut out the rounded parent corners
   * */
  // const parentWithRoundedCorners = element
  const inputBorderRadius =
    element instanceof HTMLInputElement ? "8px" : style.borderRadius || "0";
  const borderRadiusValue = parseFloat(inputBorderRadius);
  const roundProperty =
    borderRadiusValue ? ` round ${borderRadiusValue}px` : "";
  const insetValues = [
    y - borderWidth,
    context.width - x - width - borderWidth,
    context.height - y - height - borderWidth,
    x - borderWidth,
  ]
    .map((v) => (v < 0 ? 0 : v))
    .map((v) => `${v}px`)
    .join(" ");

  g.style.clipPath = `inset(${insetValues} ${roundProperty}) view-box`;

  // const { path: clipRect } = getRectanglePath(
  //   {
  //     ...style,
  //     borderTopLeftRadius: inputBorderRadius,
  //     borderTopRightRadius: inputBorderRadius,
  //     borderBottomRightRadius: inputBorderRadius,
  //     borderBottomLeftRadius: inputBorderRadius,
  //   },
  //   {
  //     x: x - borderWidth,
  //     y: y - borderWidth,
  //     width: width + 2 * borderWidth,
  //     height: height + 2 * borderWidth,
  //   },
  //   whatToRender,
  // );
  // clipRect.setAttribute("fill", "none");
  // clipRect.setAttribute("stroke", "none");

  // const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
  // const clipPathId = `${context.docId}-clip-of-${context.idCounter++}`;
  // clipPath.setAttribute("id", clipPathId);
  // const transform = g.getAttribute("transform");
  // const transformParts = transform?.split(")");
  // const translate = transformParts
  //   ?.map((part) => {
  //     if (!part.startsWith("translate")) return;
  //     const [xStr, yStr] = part.split(",");
  //     if (!xStr || !yStr) return;
  //     const x = parseFloat(xStr.split("(")[1]!);
  //     const y = parseFloat(yStr.trim());
  //     if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  //     return [x, y] as [number, number];
  //   })
  //   .find(isDefined);
  // if (translate) {
  //   const [x, y] = translate;
  //   clipRect.setAttribute("transform", `translate(${-x}, ${-y})`);
  // }
  // clipPath.appendChild(clipRect);
  // g.appendChild(clipPath);
  // g.setAttribute("clip-path", `url(#${clipPathId})`);
};

const mustAddClipPath = (element: HTMLElement, style: CSSStyleDeclaration) => {
  if (
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement ||
    element instanceof HTMLLabelElement
  ) {
    return false;
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  if (element instanceof HTMLCanvasElement) {
    return true;
  }
  if (!includes(style.overflow, ["hidden", "auto", "scroll", "clip"])) {
    return false;
  }
  if (!element.children.length && element.childNodes.length) {
    return true;
  }

  /**
   * Ensures the sql tooltip is not overflowing out of the sql editor
  if (element.className.includes("monaco-scrollable-element")) {
    debugger;
  }
   */
  const isRelativeOrAbsolute = includes(style.position, [
    "relative",
    "absolute",
  ]);

  const isBoundingChildren = Array.from(element.children).some((child) => {
    if (!isElementNode(child)) {
      return false;
    }
    const childStyle = getComputedStyle(child);
    if (childStyle.position === "absolute") return isRelativeOrAbsolute;
    if (childStyle.position !== "fixed") return true;
  });
  return isBoundingChildren;
  /* To expensive and not accurate enough */
  // return Array.from(element.children).some(
  //   (child) => isElementVisible(child).isVisible,
  // );
};
