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
  force = false,
) => {
  const getForeignObject = () => {
    console.error(
      "AVOID USING foreignObject BECAUSE IOS SAFARI DOESN'T FULLY SUPPORT IT",
      element,
    );
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
    const wrapper = document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "div",
    );
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
  // if (isSVGNode(element)) {
  //   const foreignObject = getForeignObject();

  //   const svgClone = element.cloneNode(true) as SVGElement;
  //   element.style.boxSizing = "content-box";
  //   foreignObject.setAttribute("class", svgClone.classList.toString());
  //   svgClone.style.margin = "0";
  //   foreignObject.firstChild!.appendChild(svgClone);
  //   return foreignObject;
  // }

  if (!force) return;

  const foreignObject = getForeignObject();
  const elementClone = element.cloneNode(true) as HTMLElement;

  // Move relevant animations and keyframes as well
  copyAnimationStyles(style, elementClone);
  const animationStyles = cloneAnimations(element);
  if (animationStyles) {
    foreignObject.firstChild!.appendChild(animationStyles);
  }
  foreignObject.firstChild!.appendChild(elementClone);

  return foreignObject;
};

/**
 * Extracts and clones CSS animations and keyframes from an element
 */
export const cloneAnimations = (
  element: Element,
  targetDocument: Document = document,
): HTMLStyleElement | null => {
  const computedStyle = window.getComputedStyle(element);
  const animationName = computedStyle.animationName;

  if (!animationName || animationName === "none") {
    return null;
  }

  const styleElement = targetDocument.createElement("style");
  const keyframeRules: string[] = [];
  const animationNames = animationName.split(",").map((name) => name.trim());

  // Search through all stylesheets for matching @keyframes rules
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;

      for (const rule of Array.from(rules)) {
        if (
          rule instanceof CSSKeyframesRule &&
          animationNames.includes(rule.name)
        ) {
          keyframeRules.push(rule.cssText);
        }
      }
    } catch (e) {
      // Skip stylesheets that can't be accessed (CORS)
      console.warn("Cannot access stylesheet:", e);
    }
  }

  if (keyframeRules.length > 0) {
    styleElement.textContent = keyframeRules.join("\n");
    return styleElement;
  }

  return null;
};

/**
 * Copies inline animation styles to the cloned element
 */
export const copyAnimationStyles = (
  source: CSSStyleDeclaration,
  target: HTMLElement | SVGElement,
): void => {
  const computedStyle = source;
  const animationProperties = [
    "animationName",
    "animationDuration",
    "animationTimingFunction",
    "animationDelay",
    "animationIterationCount",
    "animationDirection",
    "animationFillMode",
    "animationPlayState",
  ] as const;

  animationProperties.forEach((prop) => {
    const value = computedStyle[prop];
    if (value && value !== "none") {
      target.style[prop] = value;
    }
  });
};
