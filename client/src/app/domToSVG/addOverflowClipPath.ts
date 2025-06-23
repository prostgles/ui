import { isDefined } from "prostgles-types";
import { SVG_NAMESPACE } from "./domToSVG";
import type { SVGContext } from "./elementToSVG";
import type { getWhatToRenderOnSVG } from "./getWhatToRenderOnSVG";
import { isElementNode } from "./isElementVisible";
import { getRectanglePath } from "./rectangleToSVG";
import { includes } from "../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";

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
  whatToRender: Pick<
    Awaited<ReturnType<typeof getWhatToRenderOnSVG>>,
    "border" | "background"
  >,
) => {
  /**
   * If overflow is set to hidden, we need to add a clip path to the group
   */
  if (!mustAddClipPath(element, style)) return;

  const borderWidth =
    whatToRender.border?.type === "border" ?
      whatToRender.border.borderWidth
    : 0;
  const { path: clipRect } = getRectanglePath(
    style,
    {
      x: x - borderWidth,
      y: y - borderWidth,
      width: width + 2 * borderWidth,
      height: height + 2 * borderWidth,
    },
    whatToRender,
  );
  clipRect.setAttribute("fill", "none");
  clipRect.setAttribute("stroke", "transparent");

  const clipPath = document.createElementNS(SVG_NAMESPACE, "clipPath");
  const clipPathId = `clip-${context.idCounter++}`;
  clipPath.setAttribute("id", clipPathId);
  const transform = g.getAttribute("transform");
  const transformParts = transform?.split(")");
  const translate = transformParts
    ?.map((part) => {
      if (!part.startsWith("translate")) return;
      const [xStr, yStr] = part.split(",");
      if (!xStr || !yStr) return;
      const x = parseFloat(xStr.split("(")[1]!);
      const y = parseFloat(yStr.trim());
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      return [x, y] as [number, number];
    })
    .find(isDefined);
  if (translate) {
    const [x, y] = translate;
    clipRect.setAttribute("transform", `translate(${-x}, ${-y})`);
  }
  clipPath.appendChild(clipRect);
  g.appendChild(clipPath);
  g.setAttribute("clip-path", `url(#${clipPathId})`);
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
  const hasNormalFlowChildren = Array.from(element.children).some(
    (child) =>
      isElementNode(child) &&
      !includes(getComputedStyle(child).position, ["absolute", "fixed"]),
  );
  return hasNormalFlowChildren;
  // return Array.from(element.children).some(
  //   (child) => isElementVisible(child).isVisible,
  // );
};
