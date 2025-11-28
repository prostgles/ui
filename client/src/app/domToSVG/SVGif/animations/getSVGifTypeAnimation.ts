import type { SVGif } from "src/Testing";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import { getSVGifRevealKeyframes } from "../getSVGifRevealKeyframes";
import type { getSVGifTargetBBox } from "../getSVGifTargetBBox";
import { getSVGifZoomToAnimation } from "./getSVGifZoomToAnimation";

/**
 * Given an SVGifScenes, return the animations
 */
export const getSVGifTypeAnimation = (
  viewport: { width: number; height: number },
  { element, bbox: rawBBox }: ReturnType<typeof getSVGifTargetBBox>,
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
  if (typingDuration < 500) {
    throw [
      `Duration ${duration}ms for "type" animation on element ${elementSelector} in SVG file ${svgFileName} is too short.`,
      `Must be at least ${zoomInDuration + zoomOutDuration + waitBeforeZoomOut + 500}ms`,
    ].join("\n");
  }
  const zoomInEndTime = fromTime + zoomInDuration;
  const typingStartTime = zoomInEndTime;

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
  const zoomToStyle =
    animation.zoomToElement === false ?
      ""
    : getSVGifZoomToAnimation(
        viewport,
        { bbox: rawBBox },
        { svgDom, svgFileName },
        { ...animation, type: "zoomToElement" },
        {
          sceneId,
          sceneIndex,
          totalDuration,
          getPercent,
          fromTime,
        },
        false,
      ).style;
  return { sceneNodeAnimations, style: zoomToStyle };
};
