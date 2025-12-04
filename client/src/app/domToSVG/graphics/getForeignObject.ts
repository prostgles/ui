import { isImgNode } from "../utils/isElementVisible";
import { toFixed } from "../utils/toFixed";

export const isSVGElement = (element: Element): element is SVGElement => {
  return element instanceof SVGElement;
};

export const getForeignObject = async (
  element: Element,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
) => {
  if (isImgNode(element) && element.src.endsWith(".svg")) {
    return new Promise<SVGElement | undefined>((resolve) => {
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

          const { width, height } = element;
          const paddingLeft = parseFloat(style.paddingLeft) || 0;
          const paddingTop = parseFloat(style.paddingTop) || 0;
          svgElement.setAttribute("x", `${toFixed(x + paddingLeft)}`);
          svgElement.setAttribute("y", `${toFixed(y + paddingTop)}`);
          svgElement.setAttribute("width", `${toFixed(width)}`);
          svgElement.setAttribute("height", `${toFixed(height)}`);
          resolve(svgElement as unknown as SVGElement);
        })
        .catch((error) => {
          console.error("Error fetching SVG:", error);
          resolve(undefined);
        });
    });
  }
};
