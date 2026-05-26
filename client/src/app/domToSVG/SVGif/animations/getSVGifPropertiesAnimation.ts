import type { SVGif } from "src/Testing";
import { SVG_NAMESPACE } from "../../domToSVG";
import type { SceneNodeAnimation } from "../getSVGifAnimations";
import type { SVGifParsedScene } from "../getSVGifParsedScenes";
import type { getSVGifTargetBBox } from "../getSVGifTargetBBox";

export const getSVGifPropertiesAnimation = (
  viewport: { width: number; height: number },
  { element, bbox: rawBBox }: ReturnType<typeof getSVGifTargetBBox>,
  { svgDom, svgFileName }: SVGifParsedScene,
  animation: Extract<SVGif.Animation, { type: "properties" }>,
  {
    fromTime,
  }: {
    sceneIndex: number;
    sceneId: string;
    totalDuration: number;
    getPercent: (time: number, increment?: 0.1 | -0.1) => number;
    fromTime: number;
  },
) => {
  const { props, duration } = animation;

  const sceneNodeAnimations: SceneNodeAnimation[] = [];

  const rootGId = svgDom.querySelector(":scope > g")?.id;
  if (!rootGId) {
    throw `No root <g> element with id found in SVG file ${svgFileName}.`;
  }

  for (const [prop, values] of Object.entries(props)) {
    const smilAnimateElement = document.createElementNS(
      SVG_NAMESPACE,
      "animate",
    );
    const currentValue = element.getAttribute(prop) || "";
    smilAnimateElement.setAttribute("attributeName", prop);
    smilAnimateElement.setAttribute(
      "values",
      [currentValue, ...values].join(";"),
    );
    // smilAnimateElement.setAttribute("keyTimes", "0;1");
    smilAnimateElement.setAttribute("dur", `${duration}ms`);
    smilAnimateElement.setAttribute("begin", `${fromTime}ms`);

    smilAnimateElement.setAttribute("repeatCount", "0");
    element.appendChild(smilAnimateElement);
  }
  return { sceneNodeAnimations };
};
