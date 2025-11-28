import { includes } from "../../../dashboard/W_SQL/W_SQLBottomBar/W_SQLBottomBar";

export const isElementVisible = (element: Element) => {
  const style = window.getComputedStyle(element);
  const bbox = element.getBoundingClientRect();

  if (!isElementNode(element) && !isTextNode(element))
    return { isVisible: false, style, bbox };

  if (isTextNode(element)) {
    return {
      isVisible: !!(element.textContent as string | null)?.trim().length,
      style,
      bbox,
    };
  }
  const mightBeVisible = element.checkVisibility({
    checkOpacity: true,
    checkVisibilityCSS: true,
  });

  if (!mightBeVisible) return { isVisible: false, style, bbox };
  const parent = element.parentElement;
  if (!parent) return { isVisible: true, style, bbox };
  const isOnParentScreen = isInParentViewport(element, bbox);
  return { isVisible: isOnParentScreen, style, bbox };
};

const isInViewport = (
  bbox: DOMRect,
  vport: Pick<DOMRect, "x" | "y" | "right" | "bottom">,
) => {
  return (
    bbox.left <= vport.right &&
    vport.x <= bbox.right &&
    bbox.top <= vport.bottom &&
    vport.y <= bbox.bottom
  );
};

export const isInParentViewport = (
  element: Element,
  bbox: DOMRect,
): boolean => {
  const parent = element.parentElement;
  if (!parent) return true;
  const parentHidesOverflow =
    includes(getComputedStyle(parent).overflow, ["hidden", "scroll", "auto"]) &&
    !includes(getComputedStyle(element).position, ["absolute", "fixed"]);
  if (!parentHidesOverflow) {
    const isVisible = isInViewport(bbox, {
      x: 0,
      y: 0,
      right: window.innerWidth || document.documentElement.clientWidth,
      bottom: window.innerHeight || document.documentElement.clientHeight,
    });
    // if (!isVisible) {
    //   return Array.from(element.children).some((child) =>
    //     isInParentViewport(child, child.getBoundingClientRect()),
    //   );
    // }
    return isVisible;
  }
  const parentBbox = parent.getBoundingClientRect();
  const isVisible = isInViewport(bbox, parentBbox);
  if (!isVisible) {
    return Array.from(element.children).some((child) =>
      isInParentViewport(child, child.getBoundingClientRect()),
    );
  }
  return true;
};

const checkIfObscured = (
  element: Element,
  bbox = element.getBoundingClientRect(),
) => {
  const topElement = document.elementFromPoint(
    bbox.x + bbox.width / 2,
    bbox.y + bbox.height / 2,
  );
  if (topElement && isElementNode(topElement)) {
    const isObscured = !element.contains(topElement);
    return isObscured ? topElement : undefined;
  }
};

export const isElementNode = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE;

export const isTextNode = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE;

export const isImgNode = (node: Node): node is HTMLImageElement =>
  isElementNode(node) && node.nodeName.toLowerCase() === "img";

export const isInputOrTextAreaNode = (node: Node): node is HTMLInputElement =>
  isElementNode(node) &&
  (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement);

export const isSVGNode = (node: Node): node is SVGElement =>
  isElementNode(node) && node.nodeName.toLowerCase() === "svg";
