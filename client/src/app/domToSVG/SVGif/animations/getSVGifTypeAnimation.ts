import { fixIndent } from "@common/utils";
import type { SVGif } from "src/Testing";
import { toFixed } from "../../utils/toFixed";
import { getAnimationProperty } from "../getSVGif";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import { getSVGifRevealKeyframes } from "../getSVGifRevealKeyframes";
import type { getSVGifTargetBBox } from "../getSVGifTargetBBox";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifTypeAnimation = (
  viewport: { width: number; height: number },
  { element, bbox }: ReturnType<typeof getSVGifTargetBBox>,
  { svgDom, svgFileName }: SVGifParsedScene,
  animation: Extract<SVGif.Animation, { type: "type" }>,
  {
    sceneId,
    sceneIndex,
    totalDuration,
    getPercent,
    fromTime,
  }: {
    sceneIndex: number;
    sceneId: string;
    totalDuration: number;
    getPercent: (time: number, increment?: 0.1 | -0.1) => number;
    fromTime: number;
  },
) => {
  const { height, width } = viewport;
  const { elementSelector, duration } = animation;

  const sceneNodeAnimations: SceneNodeAnimation[] = [];
  const tSpansOrText = Array.from(
    element.querySelectorAll<SVGTSpanElement | SVGTextElement>("tspan, text"),
  );
  if (!tSpansOrText.length) {
    throw `No tspan elements found in element: ${elementSelector} in SVG file ${svgFileName}. "type" animations require the target element to contain one or more <tspan> elements.`;
  }

  const rootGId = svgDom.querySelector(":scope > g")?.id;
  if (!rootGId) {
    throw `No root <g> element with id found in SVG file ${svgFileName}. "type" animations require the SVG to have a root <g> element with an id.`;
  }

  const totalWidth = tSpansOrText.reduce(
    (acc, tspan) => acc + tspan.getComputedTextLength(),
    0,
  );
  const zoomInDuration = 500;
  const zoomOutDuration = 500;
  const waitBeforeZoomOut = 300;
  const typingDuration =
    duration - zoomInDuration - zoomOutDuration - waitBeforeZoomOut;
  if (typingDuration <= 500) {
    throw [
      `Duration ${duration}ms for "type" animation on element ${elementSelector} in SVG file ${svgFileName} is too short.`,
      `Must be at least ${zoomInDuration + zoomOutDuration + waitBeforeZoomOut + 500}ms`,
    ].join("\n");
  }
  const zoomInStartTime = fromTime;
  const zoomInEndTime = fromTime + zoomInDuration;
  const typingStartTime = zoomInEndTime;
  const typingEndTime = zoomInEndTime + typingDuration;
  const zoomOutStartTime = typingEndTime + waitBeforeZoomOut;
  const zoomOutEndTime = zoomOutStartTime + zoomOutDuration;

  const msPerPx = typingDuration / totalWidth;
  let fromTimeLocal = typingStartTime;
  tSpansOrText.forEach((tspanOrText, i) => {
    const tspanWidth = tspanOrText.getComputedTextLength();
    const tspanDuration = tspanWidth * msPerPx;
    sceneNodeAnimations.push({
      sceneId,
      elemSelector: `${elementSelector} ${tspanOrText.nodeName}:nth-of-type(${i + 1})`,
      keyframes: getSVGifRevealKeyframes({
        fromPerc: getPercent(fromTimeLocal),
        toPerc: getPercent(fromTimeLocal + tspanDuration),
        mode: "left to right",
      }),
    });
    fromTimeLocal += tspanDuration;
  });

  const xPadding = 50;
  const requiredScale = (svgDom.clientWidth - xPadding) / bbox.width;
  const effectiveScale = toFixed(requiredScale);
  const toPerc = getPercent(fromTime + duration);

  // Calculate center of the element
  const elementCenterX = toFixed(bbox.x + bbox.width / 2);
  const elementCenterY = toFixed(bbox.y + bbox.height / 2);

  // Calculate viewport center
  const viewportCenterX = toFixed(width / 2);
  const viewportCenterY = toFixed(height / 2);

  // Calculate translation needed to center the element
  const translateX = toFixed(viewportCenterX - elementCenterX);
  const translateY = toFixed(viewportCenterY - elementCenterY);

  const transformOrigin = `${elementCenterX}px ${elementCenterY}px`;

  /** Add root svg zoom in-out animation to the typed */
  const animProp = getAnimationProperty({
    animName: `scene-${sceneIndex}-type-zoom`,
    elemSelector: `svg#${sceneId} g#${rootGId}`,
    totalDuration,
    otherProps: `transform-origin: ${transformOrigin};`,
  });
  const style = fixIndent(`
    @keyframes scene-${sceneIndex}-type-zoom {
      ${getPercent(zoomInStartTime)}% { transform: translate(0px, 0px) scale(1);}
      ${getPercent(zoomInEndTime)}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
      ${getPercent(zoomOutStartTime)}% { transform: translate(${translateX}px, ${translateY}px) scale(${effectiveScale}); }
      ${getPercent(zoomOutEndTime)}% { transform: translate(0px, 0px) scale(1); }
      ${toFixed(
        Math.min(100, toPerc + 0.1),
      )}% { transform: translate(0px, 0px) scale(1); }
    }
    ${animProp}
  `);
  return { sceneNodeAnimations, style };
};
