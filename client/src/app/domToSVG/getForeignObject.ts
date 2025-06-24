import { isImgNode, isSVGNode } from "./isElementVisible";
import { SVG_NAMESPACE } from "./domToSVG";

export const isSVGElement = (element: Element): element is SVGElement => {
  return element instanceof SVGElement;
};

export const getForeignObject = (
  element: Element,
  style: CSSStyleDeclaration,
  bbox: DOMRect,
  x: number,
  y: number,
) => {
  const getForeignObject = () => {
    const foreignObject = document.createElementNS(
      SVG_NAMESPACE,
      "foreignObject",
    );
    foreignObject.style.color = style.color;
    foreignObject.style.padding = style.padding;
    foreignObject.style.margin = style.margin;
    foreignObject.style.color = style.color;
    foreignObject.setAttribute("x", `${x}`);
    foreignObject.setAttribute("y", `${y}`);
    foreignObject.setAttribute("width", `${bbox.width}`);
    foreignObject.setAttribute("height", `${bbox.height}`);
    return foreignObject;
  };

  if (isImgNode(element) && element.src.endsWith(".svg")) {
    // Fetch the SVG content and embed it to ensure portability
    return new Promise<SVGForeignObjectElement | undefined>((resolve) => {
      fetch(element.src)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
          }
          return response.text();
        })
        .then((svgContent) => {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
          const svgElement = svgDoc.documentElement;
          const foreignObject = getForeignObject();

          // Append the SVG content
          foreignObject.appendChild(svgElement);
          resolve(foreignObject);
        })
        .catch((error) => {
          console.error("Error fetching SVG:", error);
          resolve(undefined);
        });
    });
  }
  if (isSVGNode(element)) {
    const foreignObject = getForeignObject();

    const svgClone = element.cloneNode(true) as SVGElement;
    foreignObject.appendChild(svgClone);
    return foreignObject;
  }
};
