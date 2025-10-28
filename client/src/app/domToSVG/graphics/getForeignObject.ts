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
