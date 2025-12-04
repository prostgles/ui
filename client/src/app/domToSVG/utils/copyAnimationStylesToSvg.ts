import type { SVGContext } from "../containers/elementToSVG";

/**
 * Extracts and clones CSS animations and keyframes from an element
 */
const getAnimationKeyframeRules = (element: Element) => {
  const computedStyle = window.getComputedStyle(element);
  const animationName = computedStyle.animationName;

  if (!animationName || animationName === "none") {
    return;
  }

  // const styleElement = targetDocument.createElement("style");
  const keyframeRules: CSSKeyframesRule[] = [];
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
          keyframeRules.push(rule);
        }
      }
    } catch (e) {
      // Skip stylesheets that can't be accessed (CORS)
      console.warn("Cannot access stylesheet:", e);
    }
  }

  return keyframeRules;
};

/**
 * Copies inline animation styles to the cloned element
 */
const copyAnimationStylesToSvg = (
  source: CSSStyleDeclaration,
  target: HTMLElement | SVGElement,
) => {
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

  if (!source.animationName || source.animationName === "none") {
    return false;
  }
  animationProperties.forEach((prop) => {
    const value = computedStyle[prop];
    if (value && value !== "none") {
      target.style[prop] = value;
    }
  });
  /**
   * Important for correct animation scaling in SVG. Otherwise percentages are
   * calculated based on the viewport, not the element's bounding box.
   */
  target.style.transformBox = "fill-box";
  return true;
};

const copyAnimationsToSvg = (
  sourceElement: Element,
  sourceCss: CSSStyleDeclaration,
  wrapperG: SVGElement,
  cssDeclarations: SVGContext["cssDeclarations"],
): void => {
  // Extract keyframes from the original element's styles
  const copiedAnimations = copyAnimationStylesToSvg(sourceCss, wrapperG);
  if (!copiedAnimations) {
    console.error("Unexpected: could not copy animations");
    return;
  }
  const animationKeyframeRules = getAnimationKeyframeRules(sourceElement);
  if (animationKeyframeRules) {
    // defs.appendChild(animationStyles);
    // cssDeclarations.push(...animationKeyframeRules);
  }
  animationKeyframeRules?.forEach((rule) => {
    const ruleText = rule.cssText;
    if (!cssDeclarations.has(ruleText)) {
      cssDeclarations.set(ruleText, ruleText);
    }
  });
};

export const getAnimationsHandler = (sourceElement: Element) => {
  let hasAnimations = false as boolean;
  /** Ensures bbox calculations are stable */
  sourceElement.getAnimations().forEach((animation) => {
    animation.cancel();
    // animation.pause();
    // animation.currentTime = 0;
    hasAnimations = true;
  });

  if (!hasAnimations) return;
  return (
    sourceCss: CSSStyleDeclaration,
    wrapperG: SVGElement,
    cssDeclarations: SVGContext["cssDeclarations"],
  ) => copyAnimationsToSvg(sourceElement, sourceCss, wrapperG, cssDeclarations);
};
