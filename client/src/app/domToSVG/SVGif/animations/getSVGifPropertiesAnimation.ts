import type { SVGif } from "src/Testing";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import { getSVGifKeyframes } from "../getSVGifKeyframes";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import type { getSVGifTargetBBox } from "../getSVGifTargetBBox";

export const getSVGifPropertiesAnimation = (
  viewport: { width: number; height: number },
  { element, bbox: rawBBox }: ReturnType<typeof getSVGifTargetBBox>,
  { svgDom, svgFileName }: SVGifParsedScene,
  animation: Extract<SVGif.Animation, { type: "properties" }>,
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
  const { elementSelector, props, duration } = animation;

  const sceneNodeAnimations: SceneNodeAnimation[] = [];
  const svgElement = element.querySelector<SVGElement>(elementSelector);
  if (!svgElement) {
    throw `No svg element found in element: ${elementSelector} in SVG file ${svgFileName}.`;
  }

  const rootGId = svgDom.querySelector(":scope > g")?.id;
  if (!rootGId) {
    throw `No root <g> element with id found in SVG file ${svgFileName}.`;
  }

  sceneNodeAnimations.push({
    sceneId,
    elemSelector: elementSelector,
    keyframes: getSVGifKeyframes(
      {
        percentage: getPercent(fromTime),
        attributes: {},
      },
      {
        percentage: getPercent(fromTime + duration),
        attributes: props,
      },
    ),
  });
  return { sceneNodeAnimations };
};
