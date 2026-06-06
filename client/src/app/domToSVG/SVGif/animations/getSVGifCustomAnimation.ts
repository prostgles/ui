import type { SVGif } from "src/Testing";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import { getSVGifKeyframes } from "../getSVGifKeyframes";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";

export const getSVGifCustomAnimation = (
  { svgDom, svgFileName }: SVGifParsedScene,
  animation: Extract<SVGif.Animation, { type: "custom" }>,
  {
    fromTime,
    sceneId,
    getPercent,
  }: {
    sceneIndex: number;
    sceneId: string;
    totalDuration: number;
    getPercent: (time: number, increment?: 0.1 | -0.1) => number;
    fromTime: number;
  },
) => {
  const { elementSelector, attributes, duration, fixedAttributeValues } =
    animation;

  const sceneNodeAnimations: SceneNodeAnimation[] = [];

  const rootGId = svgDom.querySelector(":scope > g")?.id;
  if (!rootGId) {
    throw `No root <g> element with id found in SVG file ${svgFileName}.`;
  }

  for (const [name, [fromValue, toValue]] of Object.entries(attributes)) {
    sceneNodeAnimations.push({
      sceneId,
      elemSelector: elementSelector,
      keyframes: getSVGifKeyframes(
        {
          attributes: {
            [name]: fromValue,
          },
          percentage: getPercent(fromTime),
        },
        {
          attributes: {
            [name]: toValue,
          },
          percentage: getPercent(fromTime + duration),
        },
      ),
      fixedAttributeValues,
    });
  }
  return { sceneNodeAnimations };
};
