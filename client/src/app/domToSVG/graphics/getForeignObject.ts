import { isImgNode, isSVGNode } from "../utils/isElementVisible";
import { SVG_NAMESPACE } from "../domToSVG";
import { toFixed } from "../utils/toFixed";

export const isSVGElement = (element: Element): element is SVGElement => {
  return element instanceof SVGElement;
};

export const getForeignObject = async (
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
    /** Ensure the icon buttons icons are centered */
    foreignObject.style.display = "grid";
    foreignObject.style.placeItems = "center";
    foreignObject.setAttribute("x", `${toFixed(x)}`);
    foreignObject.setAttribute("y", `${toFixed(y)}`);
    foreignObject.setAttribute("width", `${toFixed(bbox.width)}`);
    foreignObject.setAttribute("height", `${toFixed(bbox.height)}`);
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    foreignObject.appendChild(wrapper);

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
          foreignObject.firstChild!.appendChild(svgElement);
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
    element.style.boxSizing = "content-box";
    foreignObject.setAttribute("class", svgClone.classList.toString());
    svgClone.style.margin = "0";
    foreignObject.firstChild!.appendChild(svgClone);
    return foreignObject;
  }
};
