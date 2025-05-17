export const isElementVisible = (element: HTMLElement) => {
  if (
    element.nodeType !== Node.ELEMENT_NODE &&
    element.nodeType !== Node.TEXT_NODE
  )
    return false;

  if (element.nodeType === Node.TEXT_NODE) {
    // For text nodes, check if they have non-whitespace content
    return !!element.textContent?.trim().length;
  }
  return element.checkVisibility();
};

export const isElementNode = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE;

export const isTextNode = (node: Node): node is Text =>
  node.nodeType === Node.TEXT_NODE;

export const isImgNode = (node: Node): node is HTMLImageElement =>
  node.nodeName === "IMG" && node.nodeType === Node.ELEMENT_NODE;

export const isInputNode = (node: Node): node is HTMLInputElement =>
  node.nodeName === "INPUT" && node.nodeType === Node.ELEMENT_NODE;

export const isSVGNode = (node: Node): node is SVGElement =>
  node.nodeName === "svg" && node.nodeType === Node.ELEMENT_NODE;
