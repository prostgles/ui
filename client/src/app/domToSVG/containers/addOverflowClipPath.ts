import { includes } from "../../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import type { WhatToRenderOnSVG } from "../utils/getWhatToRenderOnSVG";
import { isElementNode } from "../utils/isElementVisible";
import type { SVGContext } from "./elementToSVG";

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
  const translate = g
    .getAttribute("transform")
    ?.split("translate(")[1]
    ?.split(")")[0];
  const [transformX = 0, transformY = 0] =
    translate ? translate.split(",").map((v) => parseFloat(v.trim())) : [0, 0];

  const top = y - borderWidth - transformY;
  const right = context.width - x - width - borderWidth - transformX;
  const bottom = context.height - y - height - borderWidth - transformY;
  const left = x - borderWidth - transformX;

  const insetValues = [top, right, bottom, left]
    .map((v) => (v < 0 ? 0 : v))
    .map((v) => `${v}px`)
    .join(" ");

  g._overflowClipPath = {
    x,
    y,
    width,
    height,
  };
  g.style.clipPath = `inset(${insetValues} ${roundProperty}) view-box`;
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
